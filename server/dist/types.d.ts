export type ProposalStatus = "funding" | "active" | "completed" | "failed";
export type AgentTier = "Newcomer" | "Rising" | "Established" | "Elite";
export interface TradingAgentProposal {
    id: string;
    agentName: string;
    strategyDescription: string;
    capitalRequired: number;
    capitalRaised: number;
    collateralAmount: number;
    collateralRatioBps: number;
    commitmentPeriodDays: number;
    minReturnBps: number;
    profitSplitInvestorBps: number;
    status: ProposalStatus;
    tier: AgentTier;
    createdAt: string;
    investors: InvestorEntry[];
    performanceHistory: PerformanceSnapshot[];
}
export interface InvestorEntry {
    address: string;
    amount: number;
    token: string;
    fundedAt: string;
}
export interface PerformanceSnapshot {
    timestamp: string;
    balance: number;
    pnl: number;
    pnlPct: number;
}
export interface EvaluationResult {
    proposalId: string;
    investmentAmount: number;
    estimatedDailyReturn: number;
    estimatedMonthlyReturn: number;
    riskScore: number;
    breakEvenDays: number;
    comparisonVsSimilar: string;
}
export interface InternalPool {
    pair: string;
    address: string;
    tvl: number;
    volume24h: number;
    microFeeBps: number;
    currentPrice: number;
    externalPrice: number;
    priceDiffBps: number;
}
export interface ArbOpportunity {
    pair: string;
    internalPrice: number;
    externalPrice: number;
    spreadBps: number;
    direction: "buy_internal_sell_external" | "buy_external_sell_internal";
    optimalSize: number;
    expectedProfit: number;
}
export interface RouteResult {
    internalAmount: number;
    externalAmount: number;
    expectedOutput: number;
    totalFeeCost: number;
    savedVsExternal: number;
    internalPrice: number;
    externalPrice: number;
}
export interface AgentStatus {
    agentId: string;
    name: string;
    pnl: number;
    pnlPct: number;
    capitalAvailable: number;
    capitalDeployed: number;
    feesReceived: number;
    timeRemainingDays: number;
    tier: AgentTier;
    investorCount: number;
    status: ProposalStatus;
}
export interface OpenPosition {
    positionId: string;
    proposalId: string;
    capitalDeployed: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
    commitmentStatus: "active" | "expired";
    timeRemainingDays: number;
    agentName: string;
}
export interface LeaderboardEntry {
    rank: number;
    agentId: string;
    agentName: string;
    returnPct: number;
    sharpe: number;
    capitalManaged: number;
    cyclesCompleted: number;
    tier: AgentTier;
}
export interface ProtocolStats {
    totalTvl: number;
    activeAgents: number;
    feesDistributed: number;
    avgInvestorReturn: number;
    internalPoolTvl: number;
    totalCyclesCompleted: number;
}
