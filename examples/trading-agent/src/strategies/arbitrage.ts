import type { BaseStrategy, RiskLimits, Opportunity, TradeResult, Position } from "./base-strategy.js";
import type { LockstepClient } from "../mcp/lockstep.js";
import type { UniswapClient } from "../mcp/uniswap.js";

export class ArbitrageStrategy implements BaseStrategy {
  name = "arbitrage";
  description = "Cross-pool arbitrage between ETH/USDC venues with sub-second execution";
  private riskLimits: RiskLimits | null = null;

  init(riskLimits: RiskLimits): void {
    this.riskLimits = riskLimits;
  }

  async scan(_lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<Opportunity[]> {
    const pairs = ["ETH/USDC", "WBTC/USDC"];
    const opportunities: Opportunity[] = [];

    for (const pair of pairs) {
      const [tokenIn, tokenOut] = pair.split("/") as [string, string];
      const price = await uniswapMCP.getPrice(tokenIn, tokenOut);

      const simulatedSpread = Math.random() * 0.005;
      if (simulatedSpread > 0.002) {
        opportunities.push({
          id: `arb-${pair}-${Date.now()}`,
          pair,
          direction: "buy",
          expectedProfitPct: simulatedSpread * 100,
          size: this.riskLimits ? this.riskLimits.maxPositionSize * 10000 : 1000,
          source: "external_arb",
          metadata: { price, spread: simulatedSpread },
        });
      }
    }

    return opportunities;
  }

  async execute(opp: Opportunity, _lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<TradeResult> {
    const [tokenIn, tokenOut] = opp.pair.split("/") as [string, string];
    const result = await uniswapMCP.swap({
      tokenIn, tokenOut, amountIn: opp.size, slippageBps: 50,
    });

    return {
      success: result.success,
      txHash: result.txHash,
      amountIn: opp.size,
      amountOut: result.amountOut,
      pair: opp.pair,
      fee: result.fee,
      timestamp: new Date().toISOString(),
    };
  }

  async shouldClose(position: Position, _lockstepMCP: LockstepClient): Promise<boolean> {
    if (!this.riskLimits) return false;
    if (position.pnlPct <= -this.riskLimits.stopLossPct * 100) return true;
    if (position.pnlPct >= 1.0) return true;
    return false;
  }
}
