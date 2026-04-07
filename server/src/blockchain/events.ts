import { getRegistry, getHook } from "./contracts.js";

export function listenForAgentRegistered(
  callback: (jobId: string, agent: string, name: string) => void
): void {
  const registry = getRegistry();
  if (!registry) return;
  registry.on("AgentRegistered", (jobId: string, agent: string, name: string) => {
    callback(jobId, agent, name);
  });
}

export function listenForFundingReceived(
  callback: (jobId: string, investor: string, amount: bigint) => void
): void {
  const hook = getHook();
  if (!hook) return;
  hook.on("FundingReceived", (jobId: string, investor: string, amount: bigint) => {
    callback(jobId, investor, amount);
  });
}

export function listenForPnlReported(
  callback: (jobId: string, balance: bigint) => void
): void {
  const registry = getRegistry();
  if (!registry) return;
  registry.on("PnlReported", (jobId: string, balance: bigint) => {
    callback(jobId, balance);
  });
}
