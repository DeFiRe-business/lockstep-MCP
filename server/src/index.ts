import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMarketplaceTools } from "./tools/marketplace.js";
import { registerInvestorTools } from "./tools/investor.js";
import { registerAgentTools } from "./tools/agent.js";
import { registerRoutingTools } from "./tools/routing.js";
import { registerLeaderboardTools } from "./tools/leaderboard.js";
import { registerStatusTools } from "./tools/status.js";
import { registerAdminTools } from "./tools/admin.js";

const server = new McpServer({ name: "defire-lockstep", version: "0.1.0" });

registerMarketplaceTools(server);
registerInvestorTools(server);
registerAgentTools(server);
registerRoutingTools(server);
registerLeaderboardTools(server);
registerStatusTools(server);
registerAdminTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
