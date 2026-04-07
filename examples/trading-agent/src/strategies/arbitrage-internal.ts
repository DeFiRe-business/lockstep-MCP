import type { BaseStrategy, RiskLimits, Opportunity, TradeResult, Position } from "./base-strategy.js";
import type { LockstepClient } from "../mcp/lockstep.js";
import type { UniswapClient } from "../mcp/uniswap.js";

interface ArbOpp {
  pair: string;
  internal_price: number;
  external_price: number;
  spread_bps: number;
  direction: string;
  optimal_size: number;
  expected_profit: number;
}

export class ArbitrageInternalStrategy implements BaseStrategy {
  name = "arbitrage-internal";
  description = "Arbitrage between Lockstep internal pools and external Uniswap pools, exploiting micro-fee advantage";
  private riskLimits: RiskLimits | null = null;
  private minProfitBps = 10;

  init(riskLimits: RiskLimits): void {
    this.riskLimits = riskLimits;
  }

  async scan(lockstepMCP: LockstepClient, _uniswapMCP: UniswapClient): Promise<Opportunity[]> {
    const result = await lockstepMCP.getArbOpportunities(this.minProfitBps, 10) as {
      opportunities: ArbOpp[];
    };

    return result.opportunities.map((arb) => ({
      id: `iarb-${arb.pair}-${Date.now()}`,
      pair: arb.pair,
      direction: "buy" as const,
      expectedProfitPct: arb.spread_bps / 100,
      size: arb.optimal_size,
      source: "internal_arb" as const,
      metadata: {
        internalPrice: arb.internal_price,
        externalPrice: arb.external_price,
        spreadBps: arb.spread_bps,
        arbDirection: arb.direction,
        expectedProfit: arb.expected_profit,
      },
    }));
  }

  async execute(opp: Opportunity, lockstepMCP: LockstepClient, _uniswapMCP: UniswapClient): Promise<TradeResult> {
    const [tokenIn, tokenOut] = opp.pair.split("/") as [string, string];

    const routeResult = await lockstepMCP.smartRoute({
      token_in: tokenIn,
      token_out: tokenOut,
      amount_in: opp.size,
      execute: true,
      max_slippage_bps: 50,
    }) as {
      expected_output: number;
      total_fee_cost: number;
      message: string;
    };

    return {
      success: true,
      txHash: `0xROUTE_${Date.now().toString(16)}`,
      amountIn: opp.size,
      amountOut: routeResult.expected_output,
      pair: opp.pair,
      fee: routeResult.total_fee_cost,
      timestamp: new Date().toISOString(),
    };
  }

  async shouldClose(_position: Position, _lockstepMCP: LockstepClient): Promise<boolean> {
    return true;
  }
}
