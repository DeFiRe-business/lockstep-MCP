import { getProtocolStatsData } from "../data-store.js";
export function registerStatusTools(server) {
    server.tool("get_protocol_stats", "Get global Lockstep protocol statistics", {}, async () => {
        const stats = getProtocolStatsData();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(stats),
                }],
        };
    });
}
