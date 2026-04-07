import type { BaseStrategy, RiskLimits, Opportunity, TradeResult, Position } from "./base-strategy.js";
import type { LockstepClient } from "../mcp/lockstep.js";
import type { UniswapClient } from "../mcp/uniswap.js";

export class MarketMakingStrategy implements BaseStrategy {
  name = "market-making";
  description = "Basic market-making strategy with dynamic grid on ETH/USDC, tight spreads in calm markets";
  private riskLimits: RiskLimits | null = null;
  private gridSpreadPct = 0.002;

  init(riskLimits: RiskLimits): void {
    this.riskLimits = riskLimits;
  }

  async scan(_lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    const pair = "ETH/USDC";
    const [tokenIn, tokenOut] = pair.split("/") as [string, string];
    const midPrice = await uniswapMCP.getPrice(tokenIn, tokenOut);

    const bidPrice = midPrice * (1 - this.gridSpreadPct);
    const askPrice = midPrice * (1 + this.gridSpreadPct);

    const posSize = this.riskLimits ? this.riskLimits.maxPositionSize * 10000 / 2 : 500;

    opportunities.push({
      id: `mm-bid-${pair}-${Date.now()}`,
      pair,
      direction: "buy",
      expectedProfitPct: this.gridSpreadPct * 100,
      size: posSize,
      source: "market_making",
      metadata: { side: "bid", price: bidPrice, midPrice },
    });

    opportunities.push({
      id: `mm-ask-${pair}-${Date.now()}`,
      pair,
      direction: "sell",
      expectedProfitPct: this.gridSpreadPct * 100,
      size: posSize,
      source: "market_making",
      metadata: { side: "ask", price: askPrice, midPrice },
    });

    return opportunities;
  }

  async execute(opp: Opportunity, _lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<TradeResult> {
    const [tokenIn, tokenOut] = opp.pair.split("/") as [string, string];
    const actualIn = opp.direction === "buy" ? tokenOut : tokenIn;
    const actualOut = opp.direction === "buy" ? tokenIn : tokenOut;

    const result = await uniswapMCP.swap({
      tokenIn: actualIn, tokenOut: actualOut, amountIn: opp.size, slippageBps: 30,
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
    if (position.pnlPct >= this.gridSpreadPct * 100 * 0.8) return true;
    return false;
  }
}
