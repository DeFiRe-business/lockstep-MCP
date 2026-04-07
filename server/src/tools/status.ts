import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProtocolStatsData } from "../data-store.js";

export function registerStatusTools(server: McpServer): void {
  server.tool(
    "get_protocol_stats",
    "Get global Lockstep protocol statistics",
    {},
    async () => {
      const stats = getProtocolStatsData();

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(stats),
        }],
      };
    }
  );
}
