const proposals = [
    {
        id: "prop-001",
        agentName: "AlphaArb",
        strategyDescription: "Cross-pool arbitrage between ETH/USDC venues with sub-second execution",
        capitalRequired: 50000,
        capitalRaised: 50000,
        collateralAmount: 10000,
        collateralRatioBps: 2000,
        commitmentPeriodDays: 30,
        minReturnBps: 200,
        profitSplitInvestorBps: 7000,
        status: "active",
        tier: "Rising",
        createdAt: "2026-03-15T10:00:00Z",
        investors: [
            { address: "0xABCD...1111", amount: 30000, token: "USDC", fundedAt: "2026-03-16T08:00:00Z" },
            { address: "0xABCD...2222", amount: 20000, token: "USDC", fundedAt: "2026-03-16T12:00:00Z" },
        ],
        performanceHistory: [
            { timestamp: "2026-03-20T00:00:00Z", balance: 51200, pnl: 1200, pnlPct: 2.4 },
            { timestamp: "2026-03-27T00:00:00Z", balance: 52800, pnl: 2800, pnlPct: 5.6 },
        ],
    },
    {
        id: "prop-002",
        agentName: "MomentumBot",
        strategyDescription: "Trend-following strategy using 12h/48h EMA crossovers on ETH and WBTC",
        capitalRequired: 100000,
        capitalRaised: 65000,
        collateralAmount: 15000,
        collateralRatioBps: 1500,
        commitmentPeriodDays: 60,
        minReturnBps: 150,
        profitSplitInvestorBps: 6500,
        status: "funding",
        tier: "Newcomer",
        createdAt: "2026-04-01T14:00:00Z",
        investors: [
            { address: "0xABCD...3333", amount: 40000, token: "USDC", fundedAt: "2026-04-02T09:00:00Z" },
            { address: "0xABCD...4444", amount: 25000, token: "USDC", fundedAt: "2026-04-03T11:00:00Z" },
        ],
        performanceHistory: [],
    },
    {
        id: "prop-003",
        agentName: "GridMaker",
        strategyDescription: "Market-making with dynamic grid on ETH/USDC, tight spreads in calm markets",
        capitalRequired: 200000,
        capitalRaised: 200000,
        collateralAmount: 50000,
        collateralRatioBps: 2500,
        commitmentPeriodDays: 90,
        minReturnBps: 100,
        profitSplitInvestorBps: 6000,
        status: "active",
        tier: "Established",
        createdAt: "2026-02-10T08:00:00Z",
        investors: [
            { address: "0xABCD...5555", amount: 100000, token: "USDC", fundedAt: "2026-02-11T10:00:00Z" },
            { address: "0xABCD...6666", amount: 60000, token: "USDC", fundedAt: "2026-02-12T14:00:00Z" },
            { address: "0xABCD...7777", amount: 40000, token: "USDC", fundedAt: "2026-02-13T09:00:00Z" },
        ],
        performanceHistory: [
            { timestamp: "2026-03-01T00:00:00Z", balance: 203000, pnl: 3000, pnlPct: 1.5 },
            { timestamp: "2026-03-15T00:00:00Z", balance: 207500, pnl: 7500, pnlPct: 3.75 },
            { timestamp: "2026-04-01T00:00:00Z", balance: 211000, pnl: 11000, pnlPct: 5.5 },
        ],
    },
    {
        id: "prop-004",
        agentName: "InternalArbBot",
        strategyDescription: "Arbitrage between Lockstep internal pools and external Uniswap pools, exploiting micro-fee advantage",
        capitalRequired: 30000,
        capitalRaised: 30000,
        collateralAmount: 6000,
        collateralRatioBps: 2000,
        commitmentPeriodDays: 14,
        minReturnBps: 300,
        profitSplitInvestorBps: 7500,
        status: "completed",
        tier: "Rising",
        createdAt: "2026-03-01T12:00:00Z",
        investors: [
            { address: "0xABCD...8888", amount: 30000, token: "USDC", fundedAt: "2026-03-02T08:00:00Z" },
        ],
        performanceHistory: [
            { timestamp: "2026-03-07T00:00:00Z", balance: 31500, pnl: 1500, pnlPct: 5.0 },
            { timestamp: "2026-03-14T00:00:00Z", balance: 33200, pnl: 3200, pnlPct: 10.67 },
        ],
    },
    {
        id: "prop-005",
        agentName: "VolHarvester",
        strategyDescription: "Volatility harvesting strategy: sells overpriced options-like positions during high IV periods",
        capitalRequired: 75000,
        capitalRaised: 75000,
        collateralAmount: 11250,
        collateralRatioBps: 1500,
        commitmentPeriodDays: 45,
        minReturnBps: 250,
        profitSplitInvestorBps: 6800,
        status: "failed",
        tier: "Newcomer",
        createdAt: "2026-02-20T16:00:00Z",
        investors: [
            { address: "0xABCD...9999", amount: 50000, token: "USDC", fundedAt: "2026-02-21T10:00:00Z" },
            { address: "0xABCD...AAAA", amount: 25000, token: "USDC", fundedAt: "2026-02-22T15:00:00Z" },
        ],
        performanceHistory: [
            { timestamp: "2026-03-01T00:00:00Z", balance: 73000, pnl: -2000, pnlPct: -2.67 },
            { timestamp: "2026-03-10T00:00:00Z", balance: 62000, pnl: -13000, pnlPct: -17.33 },
        ],
    },
    {
        id: "prop-006",
        agentName: "DeltaNeutral",
        strategyDescription: "Delta-neutral yield strategy using hedged LP positions across correlated pairs",
        capitalRequired: 150000,
        capitalRaised: 42000,
        collateralAmount: 30000,
        collateralRatioBps: 2000,
        commitmentPeriodDays: 60,
        minReturnBps: 120,
        profitSplitInvestorBps: 5500,
        status: "funding",
        tier: "Newcomer",
        createdAt: "2026-04-04T18:00:00Z",
        investors: [
            { address: "0xABCD...BBBB", amount: 42000, token: "USDC", fundedAt: "2026-04-05T07:00:00Z" },
        ],
        performanceHistory: [],
    },
];
const internalPools = [
    {
        pair: "ETH/USDC",
        address: "0xPool...ETH_USDC",
        tvl: 850000,
        volume24h: 320000,
        microFeeBps: 1,
        currentPrice: 3245.50,
        externalPrice: 3248.20,
        priceDiffBps: 8,
    },
    {
        pair: "WBTC/USDC",
        address: "0xPool...WBTC_USDC",
        tvl: 1200000,
        volume24h: 180000,
        microFeeBps: 1,
        currentPrice: 68420.00,
        externalPrice: 68455.00,
        priceDiffBps: 5,
    },
    {
        pair: "ETH/WBTC",
        address: "0xPool...ETH_WBTC",
        tvl: 420000,
        volume24h: 95000,
        microFeeBps: 2,
        currentPrice: 0.04742,
        externalPrice: 0.04746,
        priceDiffBps: 8,
    },
    {
        pair: "USDC/DAI",
        address: "0xPool...USDC_DAI",
        tvl: 600000,
        volume24h: 450000,
        microFeeBps: 0.5,
        currentPrice: 1.0002,
        externalPrice: 1.0001,
        priceDiffBps: 1,
    },
];
export function getAllProposals() {
    return proposals;
}
export function getProposalById(id) {
    return proposals.find((p) => p.id === id);
}
export function getInternalPools(token) {
    if (!token)
        return internalPools;
    const t = token.toUpperCase();
    return internalPools.filter((p) => p.pair.includes(t));
}
export function getArbOpportunities(minProfitBps = 10, limit = 5) {
    const opps = internalPools
        .filter((p) => Math.abs(p.priceDiffBps) >= minProfitBps)
        .map((p) => {
        const buyInternal = p.currentPrice < p.externalPrice;
        return {
            pair: p.pair,
            internalPrice: p.currentPrice,
            externalPrice: p.externalPrice,
            spreadBps: Math.abs(p.priceDiffBps),
            direction: buyInternal
                ? "buy_internal_sell_external"
                : "buy_external_sell_internal",
            optimalSize: Math.min(p.tvl * 0.02, p.volume24h * 0.1),
            expectedProfit: (Math.abs(p.priceDiffBps) / 10000) * Math.min(p.tvl * 0.02, p.volume24h * 0.1),
        };
    })
        .sort((a, b) => b.expectedProfit - a.expectedProfit);
    return opps.slice(0, limit);
}
export function getLeaderboardData() {
    return [
        { rank: 1, agentId: "prop-003", agentName: "GridMaker", returnPct: 5.5, sharpe: 2.8, capitalManaged: 200000, cyclesCompleted: 3, tier: "Established" },
        { rank: 2, agentId: "prop-004", agentName: "InternalArbBot", returnPct: 10.67, sharpe: 3.1, capitalManaged: 30000, cyclesCompleted: 1, tier: "Rising" },
        { rank: 3, agentId: "prop-001", agentName: "AlphaArb", returnPct: 5.6, sharpe: 2.2, capitalManaged: 50000, cyclesCompleted: 1, tier: "Rising" },
        { rank: 4, agentId: "prop-005", agentName: "VolHarvester", returnPct: -17.33, sharpe: -1.5, capitalManaged: 75000, cyclesCompleted: 1, tier: "Newcomer" },
    ];
}
export function getProtocolStatsData() {
    return {
        totalTvl: 3070000,
        activeAgents: 2,
        feesDistributed: 18500,
        avgInvestorReturn: 4.2,
        internalPoolTvl: 3070000,
        totalCyclesCompleted: 6,
    };
}
export function getOpenPositions(walletAddress) {
    return [
        {
            positionId: "pos-001",
            proposalId: "prop-001",
            capitalDeployed: 30000,
            currentValue: 31680,
            pnl: 1680,
            pnlPct: 5.6,
            commitmentStatus: "active",
            timeRemainingDays: 12,
            agentName: "AlphaArb",
        },
        {
            positionId: "pos-002",
            proposalId: "prop-003",
            capitalDeployed: 60000,
            currentValue: 63300,
            pnl: 3300,
            pnlPct: 5.5,
            commitmentStatus: "active",
            timeRemainingDays: 38,
            agentName: "GridMaker",
        },
    ];
}
export function getAgentStatus(agentId) {
    const proposal = getProposalById(agentId);
    if (!proposal)
        return undefined;
    const lastPerf = proposal.performanceHistory[proposal.performanceHistory.length - 1];
    return {
        agentId: proposal.id,
        name: proposal.agentName,
        pnl: lastPerf?.pnl ?? 0,
        pnlPct: lastPerf?.pnlPct ?? 0,
        capitalAvailable: proposal.capitalRaised - (lastPerf ? lastPerf.balance - proposal.capitalRaised : 0),
        capitalDeployed: lastPerf?.balance ?? proposal.capitalRaised,
        feesReceived: 0,
        timeRemainingDays: Math.max(0, proposal.commitmentPeriodDays - 14),
        tier: proposal.tier,
        investorCount: proposal.investors.length,
        status: proposal.status,
    };
}
export function computeRouteResult(tokenIn, tokenOut, amountIn) {
    const pair = `${tokenIn.toUpperCase()}/${tokenOut.toUpperCase()}`;
    const reversePair = `${tokenOut.toUpperCase()}/${tokenIn.toUpperCase()}`;
    const pool = internalPools.find((p) => p.pair === pair || p.pair === reversePair);
    if (!pool) {
        return {
            route: {
                internalAmount: 0,
                externalAmount: amountIn,
                expectedOutput: amountIn * 0.997,
                totalFeeCost: amountIn * 0.003,
                savedVsExternal: 0,
                internalPrice: 0,
                externalPrice: 0,
            },
            pool: undefined,
        };
    }
    const internalShare = Math.min(0.6, pool.tvl > 0 ? amountIn / pool.tvl : 0);
    const internalAmount = amountIn * internalShare;
    const externalAmount = amountIn - internalAmount;
    const internalFee = internalAmount * (pool.microFeeBps / 10000);
    const externalFee = externalAmount * 0.003;
    const pureExternalFee = amountIn * 0.003;
    const price = pool.pair === pair ? pool.currentPrice : 1 / pool.currentPrice;
    const extPrice = pool.pair === pair ? pool.externalPrice : 1 / pool.externalPrice;
    return {
        route: {
            internalAmount,
            externalAmount,
            expectedOutput: (internalAmount - internalFee) * price + (externalAmount - externalFee) * extPrice,
            totalFeeCost: internalFee + externalFee,
            savedVsExternal: pureExternalFee - (internalFee + externalFee),
            internalPrice: price,
            externalPrice: extPrice,
        },
        pool,
    };
}
