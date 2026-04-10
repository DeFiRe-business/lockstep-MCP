import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

export interface Config {
  rpcUrl: string;
  registryAddress: string;
  hookAddress: string;
  internalHookAddress: string;
  routerAddress: string;
  escrowAddress: string;
  evaluatorAddress: string;
  vaultAddress: string;
  evalRegistryAddress: string;
  backendUrl?: string;
}

export type ActorRole = "trading_agent" | "investor" | "admin" | "default";

const REQUIRED = [
  "RPC_URL",
  "LOCKSTEP_REGISTRY_ADDRESS",
  "LOCKSTEP_HOOK_ADDRESS",
  "LOCKSTEP_INTERNAL_HOOK_ADDRESS",
  "LOCKSTEP_ROUTER_ADDRESS",
  "LOCKSTEP_ESCROW_ADDRESS",
  "LOCKSTEP_EVALUATOR_ADDRESS",
  "LOCKSTEP_VAULT_ADDRESS",
  "LOCKSTEP_EVAL_REGISTRY_ADDRESS",
] as const;

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`[mcp] Missing required env var: ${key}`);
  }
}

export function getConfig(): Config {
  return {
    rpcUrl: process.env.RPC_URL!,
    registryAddress: process.env.LOCKSTEP_REGISTRY_ADDRESS!,
    hookAddress: process.env.LOCKSTEP_HOOK_ADDRESS!,
    internalHookAddress: process.env.LOCKSTEP_INTERNAL_HOOK_ADDRESS!,
    routerAddress: process.env.LOCKSTEP_ROUTER_ADDRESS!,
    escrowAddress: process.env.LOCKSTEP_ESCROW_ADDRESS!,
    evaluatorAddress: process.env.LOCKSTEP_EVALUATOR_ADDRESS!,
    vaultAddress: process.env.LOCKSTEP_VAULT_ADDRESS!,
    evalRegistryAddress: process.env.LOCKSTEP_EVAL_REGISTRY_ADDRESS!,
    backendUrl: process.env.BACKEND_URL,
  };
}

let providerInstance: ethers.JsonRpcProvider | null = null;
export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(getConfig().rpcUrl);
  }
  return providerInstance;
}

const ENV_KEY_BY_ROLE: Record<ActorRole, string> = {
  trading_agent: "TRADING_AGENT_PRIVATE_KEY",
  investor: "INVESTOR_PRIVATE_KEY",
  admin: "ADMIN_PRIVATE_KEY",
  default: "MCP_PRIVATE_KEY",
};

const walletCache = new Map<ActorRole, ethers.Wallet>();

export function getSigner(role: ActorRole): ethers.Wallet {
  if (walletCache.has(role)) return walletCache.get(role)!;

  const envKey = ENV_KEY_BY_ROLE[role];
  let pk = process.env[envKey];

  // Fall back to MCP_PRIVATE_KEY for any role if the specific one isn't set
  if (!pk && role !== "default") {
    pk = process.env[ENV_KEY_BY_ROLE.default];
  }

  if (!pk) {
    throw new Error(
      `[mcp] No private key configured for role '${role}'. Set ${envKey} or MCP_PRIVATE_KEY in the environment.`,
    );
  }

  const wallet = new ethers.Wallet(pk, getProvider());
  walletCache.set(role, wallet);
  return wallet;
}
