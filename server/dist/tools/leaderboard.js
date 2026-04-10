import { z } from "zod";
import { getConfig } from "../config.js";
import { getRegistry, getEvaluator, statusName, tierName, } from "../blockchain/contracts.js";
export function registerLeaderboardTools(server) {
    server.tool("get_leaderboard", "Ranked agent leaderboard. Default behaviour iterates getAgent + Evaluated events on-chain. If BACKEND_URL is set, the backend's /api/leaderboard endpoint is preferred for speed.", {
        sort_by: z.enum(["return", "cycles", "capital"]).default("return"),
        limit: z.number().int().min(1).max(100).default(10),
    }, async ({ sort_by, limit }) => {
        try {
            const cfg = getConfig();
            // Prefer backend if configured
            if (cfg.backendUrl) {
                const url = `${cfg.backendUrl.replace(/\/$/, "")}/api/leaderboard?sort=${sort_by}&limit=${limit}`;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const json = await res.json();
                        return {
                            content: [{
                                    type: "text",
                                    text: JSON.stringify({ source: "backend", ...json }, null, 2),
                                }],
                        };
                    }
                }
                catch {
                    // fall through to on-chain
                }
            }
            const registry = getRegistry();
            const evaluator = getEvaluator();
            const next = await registry.nextAgentId();
            const upper = Number(next);
            // Pull all evaluation events once and bucket by jobId
            const evaluatedEvents = await evaluator.queryFilter(evaluator.filters.Evaluated());
            const byJob = new Map();
            for (const ev of evaluatedEvents) {
                if (!("args" in ev) || !ev.args)
                    continue;
                const jobId = ev.args.jobId.toString();
                const list = byJob.get(jobId) ?? [];
                list.push({
                    success: ev.args.success,
                    finalBalance: ev.args.finalBalance,
                    minExpected: ev.args.minExpected,
                });
                byJob.set(jobId, list);
            }
            const entries = [];
            for (let id = 1; id < upper; id++) {
                try {
                    const raw = await registry.getAgent(BigInt(id));
                    if (raw.owner === "0x0000000000000000000000000000000000000000")
                        continue;
                    const evaluations = byJob.get(id.toString()) ?? [];
                    const lastEval = evaluations[evaluations.length - 1];
                    const successful = evaluations.filter((e) => e.success).length;
                    let returnBps = null;
                    if (lastEval) {
                        const initial = lastEval.minExpected > 0n
                            ? (lastEval.minExpected * 10000n) / (10000n + raw.minReturnBps)
                            : 0n;
                        if (initial > 0n) {
                            const diff = lastEval.finalBalance >= initial
                                ? (lastEval.finalBalance - initial)
                                : -(initial - lastEval.finalBalance);
                            returnBps = Number((diff * 10000n) / initial);
                        }
                    }
                    entries.push({
                        agent_id: id.toString(),
                        name: raw.name,
                        owner: raw.owner,
                        tier: tierName(raw.tier),
                        status: statusName(raw.status),
                        capital_managed: raw.capitalManaged.toString(),
                        cycles_completed: evaluations.length,
                        successful_cycles: successful,
                        last_final_balance: lastEval ? lastEval.finalBalance.toString() : null,
                        return_bps: returnBps,
                    });
                }
                catch {
                    // skip empty slot
                }
            }
            switch (sort_by) {
                case "return":
                    entries.sort((a, b) => (b.return_bps ?? -Infinity) - (a.return_bps ?? -Infinity));
                    break;
                case "cycles":
                    entries.sort((a, b) => b.cycles_completed - a.cycles_completed);
                    break;
                case "capital":
                    entries.sort((a, b) => {
                        const av = BigInt(a.capital_managed);
                        const bv = BigInt(b.capital_managed);
                        return av < bv ? 1 : av > bv ? -1 : 0;
                    });
                    break;
            }
            const top = entries.slice(0, limit);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ source: "chain", sort_by, leaderboard: top, count: top.length }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
}
