import { ethers } from "ethers";
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
export declare function getConfig(): Config;
export declare function getProvider(): ethers.JsonRpcProvider;
export declare function getSigner(role: ActorRole): ethers.Wallet;
