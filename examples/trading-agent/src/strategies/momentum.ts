import type { BaseStrategy, RiskLimits, Opportunity, TradeResult, Position } from "./base-strategy.js";
import type { LockstepClient } from "../mcp/lockstep.js";
import type { UniswapClient } from "../mcp/uniswap.js";

export class MomentumStrategy implements BaseStrategy {
  name = "momentum";
  description = "Trend-following strategy using 12h/48h EMA crossovers on ETH and WBTC";
  private riskLimits: RiskLimits | null = null;
  private priceHistory: Map<string, number[]> = new Map();

  init(riskLimits: RiskLimits): void {
    this.riskLimits = riskLimits;
  }

  private getEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = prices[0]!;
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i]! * k + ema * (1 - k);
    }
    return ema;
  }

  async scan(_lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<Opportunity[]> {
    const pairs = ["ETH/USDC", "WBTC/USDC"];
    const opportunities: Opportunity[] = [];

    for (const pair of pairs) {
      const [tokenIn, tokenOut] = pair.split("/") as [string, string];
      const currentPrice = await uniswapMCP.getPrice(tokenIn, tokenOut);

      let history = this.priceHistory.get(pair);
      if (!history) {
        history = [];
        this.priceHistory.set(pair, history);
      }
      history.push(currentPrice);

      if (history.length < 12) continue;

      const shortEMA = this.getEMA(history.slice(-12), 12);
      const longEMA = this.getEMA(history.slice(-48), 48);

      const signal = (shortEMA - longEMA) / longEMA;

      if (Math.abs(signal) > 0.002) {
        opportunities.push({
          id: `mom-${pair}-${Date.now()}`,
          pair,
          direction: signal > 0 ? "buy" : "sell",
          expectedProfitPct: Math.abs(signal) * 100,
          size: this.riskLimits ? this.riskLimits.maxPositionSize * 10000 : 1000,
          source: "momentum",
          metadata: { shortEMA, longEMA, signal, currentPrice },
        });
      }
    }

    return opportunities;
  }

  async execute(opp: Opportunity, _lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<TradeResult> {
    const [tokenIn, tokenOut] = opp.pair.split("/") as [string, string];
    const actualIn = opp.direction === "buy" ? tokenOut : tokenIn;
    const actualOut = opp.direction === "buy" ? tokenIn : tokenOut;

    const result = await uniswapMCP.swap({
      tokenIn: actualIn, tokenOut: actualOut, amountIn: opp.size, slippageBps: 100,
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

    const history = this.priceHistory.get(position.pair);
    if (!history || history.length < 12) return false;

    const shortEMA = this.getEMA(history.slice(-12), 12);
    const longEMA = this.getEMA(history.slice(-48), 48);
    const signal = (shortEMA - longEMA) / longEMA;

    if (position.side === "long" && signal < -0.001) return true;
    if (position.side === "short" && signal > 0.001) return true;

    return false;
  }
}
