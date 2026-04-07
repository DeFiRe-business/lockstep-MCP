import type { TradingAgentProposal, InternalPool, ArbOpportunity, LeaderboardEntry, OpenPosition, ProtocolStats, AgentStatus } from "./types.js";
export declare function getAllProposals(): TradingAgentProposal[];
export declare function getProposalById(id: string): TradingAgentProposal | undefined;
export declare function getInternalPools(token?: string): InternalPool[];
export declare function getArbOpportunities(minProfitBps?: number, limit?: number): ArbOpportunity[];
export declare function getLeaderboardData(): LeaderboardEntry[];
export declare function getProtocolStatsData(): ProtocolStats;
export declare function getOpenPositions(walletAddress: string): OpenPosition[];
export declare function getAgentStatus(agentId: string): AgentStatus | undefined;
export declare function computeRouteResult(tokenIn: string, tokenOut: string, amountIn: number): {
    route: import("./types.js").RouteResult;
    pool: InternalPool | undefined;
};
