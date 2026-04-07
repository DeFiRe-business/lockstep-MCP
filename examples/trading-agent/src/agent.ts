import { LockstepClient } from "./mcp/lockstep.js";
import { UniswapClient } from "./mcp/uniswap.js";
import type { BaseStrategy, Opportunity, Position, RiskLimits } from "./strategies/base-strategy.js";
import { ArbitrageInternalStrategy } from "./strategies/arbitrage-internal.js";
import { ArbitrageStrategy } from "./strategies/arbitrage.js";
import { MomentumStrategy } from "./strategies/momentum.js";
import { MarketMakingStrategy } from "./strategies/market-making.js";
import { canOpenPosition } from "./risk/exposure.js";
import { kellySize } from "./risk/position-sizing.js";
import { initStopLoss, updateStopLoss, isStopHit } from "./risk/stop-loss.js";
import type { StopLossState, StopLossConfig } from "./risk/stop-loss.js";
import { FeeManager } from "./capital/fee-manager.js";
import { ProfitTracker } from "./capital/profit-tracker.js";

interface AgentConfig {
  name: string;
  strategyName: string;
  lockstepServer: string;
  uniswapServer: string;
  risk: RiskLimits;
  pools: string[];
  minProfitThreshold: number;
  checkIntervalMs: number;
  pnlReportIntervalMs: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  name: "MyAgent",
  strategyName: "arbitrage-internal",
  lockstepServer: "node",
  uniswapServer: "https://mcp.uniswap.org",
  risk: {
    maxPositionSize: 0.20,
    maxTotalExposure: 0.80,
    stopLossPct: 0.05,
    maxDrawdownPct: 0.15,
  },
  pools: ["ETH/USDC", "WBTC/USDC"],
  minProfitThreshold: 0.002,
  checkIntervalMs: 30_000,
  pnlReportIntervalMs: 3_600_000,
};

const STRATEGIES: Record<string, () => BaseStrategy> = {
  "arbitrage-internal": () => new ArbitrageInternalStrategy(),
  "arbitrage": () => new ArbitrageStrategy(),
  "momentum": () => new MomentumStrategy(),
  "market-making": () => new MarketMakingStrategy(),
};

export class TradingAgent {
  private config: AgentConfig;
  private lockstep: LockstepClient;
  private uniswap: UniswapClient;
  private strategy: BaseStrategy;
  private feeManager: FeeManager;
  private profitTracker: ProfitTracker;
  private positions: Position[] = [];
  private stopLosses: Map<string, StopLossState> = new Map();
  private stopLossConfig: StopLossConfig;
  private agentId: string | null = null;
  private running = false;
  private capitalAvailable = 0;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lockstep = new LockstepClient();
    this.uniswap = new UniswapClient();

    const strategyFactory = STRATEGIES[this.config.strategyName];
    if (!strategyFactory) {
      throw new Error(`Unknown strategy: ${this.config.strategyName}. Available: ${Object.keys(STRATEGIES).join(", ")}`);
    }
    this.strategy = strategyFactory();
    this.strategy.init(this.config.risk);

    this.feeManager = new FeeManager();
    this.profitTracker = new ProfitTracker(0);
    this.stopLossConfig = {
      initialStopPct: this.config.risk.stopLossPct,
      trailingEnabled: true,
      trailingDistancePct: this.config.risk.stopLossPct,
    };
  }

  async connectMCPs(): Promise<void> {
    console.log(`[${this.config.name}] Connecting to Lockstep MCP...`);
    await this.lockstep.connect(this.config.lockstepServer, ["dist/index.js"]);
    console.log(`[${this.config.name}] Connecting to Uniswap MCP...`);
    await this.uniswap.connect(this.config.uniswapServer);
    console.log(`[${this.config.name}] MCPs connected.`);
  }

  async browseProposals(): Promise<unknown[]> {
    console.log(`[${this.config.name}] Browsing active proposals...`);
    const result = await this.lockstep.listProposals({ status: "funding", sort_by: "newest" }) as {
      proposals: unknown[];
    };
    console.log(`[${this.config.name}] Found ${result.proposals.length} proposals in funding.`);
    return result.proposals;
  }

  async evaluateProposal(proposalId: string, amount: number): Promise<unknown> {
    console.log(`[${this.config.name}] Evaluating proposal ${proposalId} for ${amount}...`);
    return this.lockstep.evaluateProposal(proposalId, amount);
  }

  async acceptProposal(params: {
    capitalRequired: number;
    collateralAmount: number;
    commitmentDays: number;
    minReturnBps: number;
    profitSplitInvestorBps: number;
  }): Promise<string> {
    console.log(`[${this.config.name}] Registering as trading agent...`);
    const result = await this.lockstep.registerAgent({
      name: this.config.name,
      strategy_description: this.strategy.description,
      capital_required: params.capitalRequired,
      collateral_amount: params.collateralAmount,
      commitment_period_days: params.commitmentDays,
      min_return_bps: params.minReturnBps,
      profit_split_investor_bps: params.profitSplitInvestorBps,
    }) as { agent_id: string };

    this.agentId = result.agent_id;
    this.capitalAvailable = params.capitalRequired;
    this.profitTracker = new ProfitTracker(params.capitalRequired);
    console.log(`[${this.config.name}] Registered with agent_id: ${this.agentId}`);
    return this.agentId;
  }

  async tradingLoop(): Promise<void> {
    if (!this.agentId) throw new Error("Agent not registered. Call acceptProposal first.");

    this.running = true;
    let lastPnlReport = Date.now();
    console.log(`[${this.config.name}] Starting trading loop with strategy: ${this.strategy.name}`);

    while (this.running) {
      try {
        for (const position of this.positions) {
          const sl = this.stopLosses.get(position.id);
          if (sl) {
            const updated = updateStopLoss(sl, position.currentPrice, this.stopLossConfig);
            this.stopLosses.set(position.id, updated);
            if (isStopHit(updated, position.currentPrice)) {
              console.log(`[${this.config.name}] Stop-loss hit for position ${position.id}`);
              this.positions = this.positions.filter((p) => p.id !== position.id);
              this.stopLosses.delete(position.id);
              continue;
            }
          }

          const shouldClose = await this.strategy.shouldClose(position, this.lockstep);
          if (shouldClose) {
            console.log(`[${this.config.name}] Strategy says close position ${position.id}`);
            this.positions = this.positions.filter((p) => p.id !== position.id);
            this.stopLosses.delete(position.id);
          }
        }

        const opportunities = await this.strategy.scan(this.lockstep, this.uniswap);

        for (const opp of opportunities) {
          if (opp.expectedProfitPct < this.config.minProfitThreshold * 100) continue;

          const currentExposure = this.positions.reduce((sum, p) => sum + p.size, 0);
          const check = canOpenPosition({
            totalCapital: this.capitalAvailable,
            currentExposure,
            maxTotalExposure: this.config.risk.maxTotalExposure,
            maxSinglePosition: this.config.risk.maxPositionSize,
          }, opp.size);

          if (!check.allowed) {
            console.log(`[${this.config.name}] Skipping ${opp.id}: ${check.reason}`);
            continue;
          }

          const sized = kellySize({
            capitalAvailable: this.capitalAvailable - currentExposure,
            maxPositionSize: this.config.risk.maxPositionSize,
            winRate: 0.55,
            avgWinLossRatio: 1.5,
          });
          opp.size = Math.min(opp.size, sized);

          console.log(`[${this.config.name}] Executing opportunity ${opp.id} (${opp.pair}, ${opp.expectedProfitPct.toFixed(2)}%)`);
          const result = await this.strategy.execute(opp, this.lockstep, this.uniswap);

          if (result.success) {
            this.feeManager.recordFee("swap_fee", result.fee, `Trade on ${result.pair}`);
            if (opp.source !== "internal_arb") {
              const position: Position = {
                id: `pos-${Date.now()}`,
                pair: opp.pair,
                side: opp.direction === "buy" ? "long" : "short",
                entryPrice: result.amountIn / result.amountOut,
                currentPrice: result.amountIn / result.amountOut,
                size: result.amountIn,
                pnl: 0,
                pnlPct: 0,
                openedAt: result.timestamp,
              };
              this.positions.push(position);
              this.stopLosses.set(position.id, initStopLoss(position.entryPrice, this.stopLossConfig));
            }
          }
        }

        if (Date.now() - lastPnlReport >= this.config.pnlReportIntervalMs) {
          const balance = this.capitalAvailable + this.positions.reduce((sum, p) => sum + p.pnl, 0);
          const snapshot = this.profitTracker.recordSnapshot(balance, this.positions.length);
          await this.lockstep.reportPnl(this.agentId!, balance, this.positions.length);
          console.log(`[${this.config.name}] P&L reported: ${snapshot.pnlPct.toFixed(2)}% (${snapshot.pnl.toFixed(2)})`);
          lastPnlReport = Date.now();
        }

        await sleep(this.config.checkIntervalMs);
      } catch (err) {
        console.error(`[${this.config.name}] Error in trading loop:`, err);
        await sleep(5000);
      }
    }
  }

  async closeCycle(): Promise<void> {
    console.log(`[${this.config.name}] Closing cycle...`);
    this.running = false;

    for (const position of this.positions) {
      console.log(`[${this.config.name}] Closing position ${position.id}`);
    }
    this.positions = [];
    this.stopLosses.clear();

    if (this.agentId) {
      const balance = this.capitalAvailable;
      await this.lockstep.reportPnl(this.agentId, balance, 0);
      console.log(`[${this.config.name}] Final P&L reported.`);
    }

    console.log(`[${this.config.name}] Cycle closed. Total fees: ${this.feeManager.getTotalFees().toFixed(2)}`);
    console.log(`[${this.config.name}] Max drawdown: ${(this.profitTracker.getMaxDrawdown() * 100).toFixed(2)}%`);
  }

  stop(): void {
    this.running = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const agent = new TradingAgent();

  try {
    await agent.connectMCPs();
    const proposals = await agent.browseProposals();
    console.log("Available proposals:", JSON.stringify(proposals, null, 2));
  } catch (err) {
    console.error("Agent failed:", err);
  }
}

main().catch(console.error);
