import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getRegistry,
  getHook,
  getVault,
  statusName,
  tierName,
} from "../blockchain/contracts.js";

interface AgentSummary {
  agent_id: string;
  owner: string;
  name: string;
  strategy: string;
  collateral: string;
  capital_managed: string;
  commitment_deadline: string;
  min_return_bps: string;
  profit_split_investor_bps: string;
  profit_split_agent_bps: string;
  profit_split_protocol_bps: string;
  tier: string;
  status: string;
}

function serializeAgent(agentId: bigint, raw: any): AgentSummary {
  return {
    agent_id: agentId.toString(),
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
  };
}

export function registerMarketplaceTools(server: McpServer): void {
  server.tool(
    "list_agents",
    "List all trading agents registered on Lockstep. Iterates getAgent(1..nextAgentId-1) and skips slots that no longer resolve.",
    {
      status: z.enum(["Funding", "Active", "Completed", "Failed"]).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    async ({ status, limit }) => {
      try {
        const registry = getRegistry();
        const next: bigint = await registry.nextAgentId();
        const upper = Number(next);
        const collected: AgentSummary[] = [];

        for (let id = 1; id < upper; id++) {
          try {
            const raw = await registry.getAgent(BigInt(id));
            if (raw.owner === "0x0000000000000000000000000000000000000000") continue;
            const summary = serializeAgent(BigInt(id), raw);
            if (status && summary.status !== status) continue;
            collected.push(summary);
          } catch {
            // AgentNotFound — slot empty, skip
          }
          if (limit && collected.length >= limit) break;
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ agents: collected, count: collected.length }, null, 2),
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
    "get_agent_details",
    "Get full details of a single agent, including committed collateral and current investor count.",
    {
      agent_id: z.number().int().positive(),
    },
    async ({ agent_id }) => {
      try {
        const registry = getRegistry();
        const hook = getHook();
        const vault = getVault();

        const raw = await registry.getAgent(BigInt(agent_id));
        const summary = serializeAgent(BigInt(agent_id), raw);

        const [committedCollateral, investors, totalLiquidity] = await Promise.all([
          vault.committedCollateral(BigInt(agent_id)) as Promise<bigint>,
          hook.getJobInvestors(BigInt(agent_id)) as Promise<string[]>,
          hook.totalJobLiquidity(BigInt(agent_id)) as Promise<bigint>,
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              ...summary,
              committed_collateral: committedCollateral.toString(),
              total_job_liquidity: totalLiquidity.toString(),
              investor_count: investors.length,
              investors,
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
}
