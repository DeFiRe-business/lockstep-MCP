import dotenv from "dotenv";
import { ethers } from "ethers";
dotenv.config();
export function getConfig() {
    return {
        rpcUrl: process.env.RPC_URL,
        registryAddress: process.env.LOCKSTEP_REGISTRY_ADDRESS,
        hookAddress: process.env.LOCKSTEP_HOOK_ADDRESS,
        internalHookAddress: process.env.LOCKSTEP_INTERNAL_HOOK_ADDRESS,
        routerAddress: process.env.LOCKSTEP_ROUTER_ADDRESS,
        walletAddress: process.env.WALLET_ADDRESS,
    };
}
let providerInstance = null;
export function getProvider() {
    const config = getConfig();
    if (!config.rpcUrl)
        return null;
    if (!providerInstance) {
        providerInstance = new ethers.JsonRpcProvider(config.rpcUrl);
    }
    return providerInstance;
}
