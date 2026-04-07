import { ethers } from "ethers";
export declare function getRegistry(): ethers.Contract | null;
export declare function getHook(): ethers.Contract | null;
export declare function getInternalHook(): ethers.Contract | null;
export declare function getRouter(): ethers.Contract | null;
export declare function getAgentFromChain(jobId: string): Promise<{
    agent: string;
    name: string;
    capital: bigint;
    collateral: bigint;
    pnl: bigint;
    status: number;
} | null>;
export declare function getInvestorPositionFromChain(jobId: string, investor: string): Promise<{
    amount: bigint;
    fundedAt: bigint;
    currentValue: bigint;
} | null>;
export declare function getInternalPoolStateFromChain(poolId: string): Promise<{
    tvl: bigint;
    volume24h: bigint;
    microFeeBps: number;
    price: bigint;
} | null>;
export declare function getOptimalRouteFromChain(tokenIn: string, tokenOut: string, amountIn: bigint): Promise<{
    internalAmount: bigint;
    externalAmount: bigint;
    expectedOutput: bigint;
} | null>;
