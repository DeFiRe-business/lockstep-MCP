import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

export interface Config {
  rpcUrl: string | undefined;
  registryAddress: string | undefined;
  hookAddress: string | undefined;
  internalHookAddress: string | undefined;
  routerAddress: string | undefined;
  walletAddress: string | undefined;
}

export function getConfig(): Config {
  return {
    rpcUrl: process.env.RPC_URL,
    registryAddress: process.env.LOCKSTEP_REGISTRY_ADDRESS,
    hookAddress: process.env.LOCKSTEP_HOOK_ADDRESS,
    internalHookAddress: process.env.LOCKSTEP_INTERNAL_HOOK_ADDRESS,
    routerAddress: process.env.LOCKSTEP_ROUTER_ADDRESS,
    walletAddress: process.env.WALLET_ADDRESS,
  };
}

let providerInstance: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider | null {
  const config = getConfig();
  if (!config.rpcUrl) return null;
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return providerInstance;
}
