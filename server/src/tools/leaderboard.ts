import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLeaderboardData } from "../data-store.js";

export function registerLeaderboardTools(server: McpServer): void {
  server.tool(
    "get_leaderboard",
    "Get ranked trading agent leaderboard",
    {
      period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      sort_by: z.enum(["return", "sharpe", "capital", "cycles"]).default("return"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ period, sort_by, limit }) => {
      let entries = getLeaderboardData();

      switch (sort_by) {
        case "return":
          entries.sort((a, b) => b.returnPct - a.returnPct);
          break;
        case "sharpe":
          entries.sort((a, b) => b.sharpe - a.sharpe);
          break;
        case "capital":
          entries.sort((a, b) => b.capitalManaged - a.capitalManaged);
          break;
        case "cycles":
          entries.sort((a, b) => b.cyclesCompleted - a.cyclesCompleted);
          break;
      }

      entries = entries.slice(0, limit);
      entries.forEach((e, i) => (e.rank = i + 1));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ period, sort_by, leaderboard: entries, count: entries.length }),
        }],
      };
    }
  );
}
