import { getRegistry, getHook } from "./contracts.js";
export function listenForAgentRegistered(callback) {
    const registry = getRegistry();
    if (!registry)
        return;
    registry.on("AgentRegistered", (jobId, agent, name) => {
        callback(jobId, agent, name);
    });
}
export function listenForFundingReceived(callback) {
    const hook = getHook();
    if (!hook)
        return;
    hook.on("FundingReceived", (jobId, investor, amount) => {
        callback(jobId, investor, amount);
    });
}
export function listenForPnlReported(callback) {
    const registry = getRegistry();
    if (!registry)
        return;
    registry.on("PnlReported", (jobId, balance) => {
        callback(jobId, balance);
    });
}
