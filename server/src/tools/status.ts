import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";
import {
  getRegistry,
  getEvalRegistry,
  getVault,
  statusName,
} from "../blockchain/contracts.js";

export function registerStatusTools(server: McpServer): void {
  server.tool(
    "get_protocol_stats",
    "Aggregate protocol-wide statistics. Iterates every agent on-chain. If BACKEND_URL is set, the backend's /api/stats endpoint is preferred for speed.",
    {},
    async () => {
      try {
        const cfg = getConfig();

        if (cfg.backendUrl) {
          const url = `${cfg.backendUrl.replace(/\/$/, "")}/api/stats`;
          try {
            const res = await fetch(url);
            if (res.ok) {
              const json = await res.json();
              return {
                content: [{
                  type: "text" as const,
                  text: JSON.stringify({ source: "backend", ...json }, null, 2),
                }],
              };
            }
          } catch {
            // fall through to chain
          }
        }

        const registry = getRegistry();
        const evalRegistry = getEvalRegistry();
        const vault = getVault();

        const next: bigint = await registry.nextAgentId();
        const upper = Number(next);

        let activeCount = 0;
        let fundingCount = 0;
        let completedCount = 0;
        let failedCount = 0;
        let tvl = 0n;
        let committed = 0n;

        for (let id = 1; id < upper; id++) {
          try {
            const raw = await registry.getAgent(BigInt(id));
            if (raw.owner === "0x0000000000000000000000000000000000000000") continue;
            const status = statusName(raw.status);
            switch (status) {
              case "Active":
                activeCount++;
                tvl += raw.capitalManaged as bigint;
                break;
              case "Funding":
                fundingCount++;
                tvl += raw.capitalManaged as bigint;
                break;
              case "Completed":
                completedCount++;
                break;
              case "Failed":
                failedCount++;
                break;
            }

            try {
              const c: bigint = await vault.committedCollateral(BigInt(id));
              committed += c;
            } catch {
              // ignore
            }
          } catch {
            // skip
          }
        }

        const totalSlashedFunds: bigint = await evalRegistry.totalSlashedFunds();
        const slashCount: bigint = await evalRegistry.slashCount();
        const minStake: bigint = await evalRegistry.minStake();

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              source: "chain",
              next_agent_id: next.toString(),
              active_agents: activeCount,
              funding_agents: fundingCount,
              completed_agents: completedCount,
              failed_agents: failedCount,
              total_capital_managed: tvl.toString(),
              total_committed_collateral: committed.toString(),
              total_slashed_funds: totalSlashedFunds.toString(),
              slash_count: slashCount.toString(),
              evaluator_min_stake: minStake.toString(),
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
