import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getRegistry,
  getRegistryAs,
  getVaultAs,
  statusName,
  tierName,
} from "../blockchain/contracts.js";

export function registerAgentTools(server: McpServer): void {
  server.tool(
    "register_trading_agent",
    "Register the caller as a trading agent on the LockstepRegistry. Requires TRADING_AGENT_PRIVATE_KEY (or MCP_PRIVATE_KEY).",
    {
      name: z.string().min(1).max(64),
      strategy: z.string().min(10).max(500),
      collateral: z.string().describe("Collateral in wei (string-encoded uint256)"),
      capital_managed: z.string().describe("Capital managed in wei"),
      commitment_deadline: z.number().int().describe("Unix timestamp"),
      min_return_bps: z.number().int().min(0).max(10000),
      profit_split_investor_bps: z.number().int().min(0).max(10000),
      profit_split_agent_bps: z.number().int().min(0).max(10000),
      profit_split_protocol_bps: z.number().int().min(0).max(10000),
    },
    async (params) => {
      try {
        const registry = getRegistryAs("trading_agent");
        const tx = await registry.registerTradingAgent(
          params.name,
          params.strategy,
          BigInt(params.collateral),
          BigInt(params.capital_managed),
          BigInt(params.commitment_deadline),
          BigInt(params.min_return_bps),
          BigInt(params.profit_split_investor_bps),
          BigInt(params.profit_split_agent_bps),
          BigInt(params.profit_split_protocol_bps),
        );
        const receipt = await tx.wait();

        // Parse AgentRegistered event to get the assigned agentId
        const parsed = receipt?.logs
          .map((log: any) => {
            try { return registry.interface.parseLog(log); } catch { return null; }
          })
          .find((p: any) => p?.name === "AgentRegistered");

        const agentId = parsed?.args?.agentId?.toString() ?? "unknown";

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              agent_id: agentId,
              tx_hash: tx.hash,
              block_number: receipt?.blockNumber,
              gas_used: receipt?.gasUsed?.toString(),
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_my_agent_status",
    "Read on-chain status of an agent the trading-agent role owns. Identifies the agent by its numeric agent_id.",
    {
      agent_id: z.number().int().positive(),
    },
    async ({ agent_id }) => {
      try {
        const registry = getRegistry();
        const raw = await registry.getAgent(BigInt(agent_id));
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              agent_id,
              owner: raw.owner,
              name: raw.name,
              strategy: raw.strategy,
              collateral: raw.collateral.toString(),
              capital_managed: raw.capitalManaged.toString(),
              commitment_deadline: raw.commitmentDeadline.toString(),
              min_return_bps: raw.minReturnBps.toString(),
              profit_split_investor_bps: raw.profitSplitInvestorBps.toString(),
              profit_split_agent_bps: raw.profitSplitAgentBps.toString(),
              profit_split_protocol_bps: raw.profitSplitProtocolBps.toString(),
              tier: tierName(raw.tier),
              status: statusName(raw.status),
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "deposit_collateral",
    "Deposit native ETH into the CollateralVault under the trading-agent's address. Requires TRADING_AGENT_PRIVATE_KEY (or MCP_PRIVATE_KEY).",
    {
      amount: z.string().describe("Amount in wei (string-encoded uint256)"),
    },
    async ({ amount }) => {
      try {
        const vault = getVaultAs("trading_agent");
        const tx = await vault.deposit({ value: BigInt(amount) });
        const receipt = await tx.wait();
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              amount,
              tx_hash: tx.hash,
              block_number: receipt?.blockNumber,
              gas_used: receipt?.gasUsed?.toString(),
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "commit_to_job",
    "Commit a portion of the trading-agent's deposited collateral to a specific job. Requires TRADING_AGENT_PRIVATE_KEY (or MCP_PRIVATE_KEY).",
    {
      job_id: z.number().int().positive(),
      amount: z.string().describe("Amount in wei to commit"),
    },
    async ({ job_id, amount }) => {
      try {
        const vault = getVaultAs("trading_agent");
        const tx = await vault.commitToJob(BigInt(job_id), BigInt(amount));
        const receipt = await tx.wait();
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              job_id,
              amount,
              tx_hash: tx.hash,
              block_number: receipt?.blockNumber,
              gas_used: receipt?.gasUsed?.toString(),
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          }],
          isError: true,
        };
      }
    },
  );

  // NOTE: report_pnl was removed because LockstepRegistry has no reportPnl
  // function in the current ABI (verified against
  // ../lockstep/packages/contracts/src/core/LockstepRegistry.sol). The previous
  // simulation called a non-existent function. P&L is derived on-chain by the
  // PerformanceEvaluator from TradingEscrow.jobBalances at evaluation time, not
  // self-reported by agents.
}
