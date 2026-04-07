import { ethers } from "ethers";
export interface Config {
    rpcUrl: string | undefined;
    registryAddress: string | undefined;
    hookAddress: string | undefined;
    internalHookAddress: string | undefined;
    routerAddress: string | undefined;
    walletAddress: string | undefined;
}
export declare function getConfig(): Config;
export declare function getProvider(): ethers.JsonRpcProvider | null;
