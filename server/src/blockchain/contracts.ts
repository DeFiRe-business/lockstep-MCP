import { ethers } from "ethers";
import { getConfig, getProvider } from "../config.js";

const REGISTRY_ABI = [
  "function getAgent(bytes32 jobId) view returns (address agent, string name, uint256 capital, uint256 collateral, uint256 pnl, uint8 status)",
  "function registerAgent(string name, string strategy, uint256 capitalRequired, uint256 collateral, uint32 commitmentDays, uint16 minReturnBps, uint16 profitSplitBps) payable returns (bytes32 jobId)",
  "function reportPnl(bytes32 jobId, uint256 currentBalance, uint256 openPositions)",
];

const HOOK_ABI = [
  "function getInvestorPosition(bytes32 jobId, address investor) view returns (uint256 amount, uint256 fundedAt, uint256 currentValue)",
  "function fund(bytes32 jobId) payable",
  "function withdraw(bytes32 jobId, uint256 amount)",
  "function fileClaim(bytes32 jobId, uint256 claimAmount)",
];

const INTERNAL_HOOK_ABI = [
  "function getPoolState(bytes32 poolId) view returns (uint256 tvl, uint256 volume24h, uint16 microFeeBps, uint256 price)",
  "function listPools() view returns (bytes32[] memory poolIds)",
];

const ROUTER_ABI = [
  "function getOptimalRoute(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256 internalAmount, uint256 externalAmount, uint256 expectedOutput)",
  "function executeRoute(address tokenIn, address tokenOut, uint256 amountIn, uint16 maxSlippageBps) returns (uint256 amountOut)",
];

export function getRegistry(): ethers.Contract | null {
  const config = getConfig();
  const provider = getProvider();
  if (!config.registryAddress || !provider) return null;
  return new ethers.Contract(config.registryAddress, REGISTRY_ABI, provider);
}

export function getHook(): ethers.Contract | null {
  const config = getConfig();
  const provider = getProvider();
  if (!config.hookAddress || !provider) return null;
  return new ethers.Contract(config.hookAddress, HOOK_ABI, provider);
}

export function getInternalHook(): ethers.Contract | null {
  const config = getConfig();
  const provider = getProvider();
  if (!config.internalHookAddress || !provider) return null;
  return new ethers.Contract(config.internalHookAddress, INTERNAL_HOOK_ABI, provider);
}

export function getRouter(): ethers.Contract | null {
  const config = getConfig();
  const provider = getProvider();
  if (!config.routerAddress || !provider) return null;
  return new ethers.Contract(config.routerAddress, ROUTER_ABI, provider);
}

export async function getAgentFromChain(jobId: string): Promise<{
  agent: string;
  name: string;
  capital: bigint;
  collateral: bigint;
  pnl: bigint;
  status: number;
} | null> {
  try {
    const registry = getRegistry();
    if (!registry) return null;
    const result = await registry.getAgent(jobId);
    return {
      agent: result[0],
      name: result[1],
      capital: result[2],
      collateral: result[3],
      pnl: result[4],
      status: Number(result[5]),
    };
  } catch {
    return null;
  }
}

export async function getInvestorPositionFromChain(
  jobId: string,
  investor: string
): Promise<{ amount: bigint; fundedAt: bigint; currentValue: bigint } | null> {
  try {
    const hook = getHook();
    if (!hook) return null;
    const result = await hook.getInvestorPosition(jobId, investor);
    return {
      amount: result[0],
      fundedAt: result[1],
      currentValue: result[2],
    };
  } catch {
    return null;
  }
}

export async function getInternalPoolStateFromChain(
  poolId: string
): Promise<{ tvl: bigint; volume24h: bigint; microFeeBps: number; price: bigint } | null> {
  try {
    const internalHook = getInternalHook();
    if (!internalHook) return null;
    const result = await internalHook.getPoolState(poolId);
    return {
      tvl: result[0],
      volume24h: result[1],
      microFeeBps: Number(result[2]),
      price: result[3],
    };
  } catch {
    return null;
  }
}

export async function getOptimalRouteFromChain(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<{ internalAmount: bigint; externalAmount: bigint; expectedOutput: bigint } | null> {
  try {
    const router = getRouter();
    if (!router) return null;
    const result = await router.getOptimalRoute(tokenIn, tokenOut, amountIn);
    return {
      internalAmount: result[0],
      externalAmount: result[1],
      expectedOutput: result[2],
    };
  } catch {
    return null;
  }
}
