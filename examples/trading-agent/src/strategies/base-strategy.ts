import type { LockstepClient } from "../mcp/lockstep.js";
import type { UniswapClient } from "../mcp/uniswap.js";

export interface RiskLimits {
  maxPositionSize: number;
  maxTotalExposure: number;
  stopLossPct: number;
  maxDrawdownPct: number;
}

export interface Opportunity {
  id: string;
  pair: string;
  direction: "buy" | "sell";
  expectedProfitPct: number;
  size: number;
  source: "internal_arb" | "external_arb" | "momentum" | "market_making";
  metadata: Record<string, unknown>;
}

export interface TradeResult {
  success: boolean;
  txHash: string | null;
  amountIn: number;
  amountOut: number;
  pair: string;
  fee: number;
  timestamp: string;
}

export interface Position {
  id: string;
  pair: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  openedAt: string;
}

export interface BaseStrategy {
  name: string;
  description: string;
  init(riskLimits: RiskLimits): void;
  scan(lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<Opportunity[]>;
  execute(opp: Opportunity, lockstepMCP: LockstepClient, uniswapMCP: UniswapClient): Promise<TradeResult>;
  shouldClose(position: Position, lockstepMCP: LockstepClient): Promise<boolean>;
}
