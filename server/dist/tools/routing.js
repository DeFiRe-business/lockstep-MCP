import { z } from "zod";
import { getInternalPools as getInternalPoolsData, getArbOpportunities as getArbOpportunitiesData, computeRouteResult } from "../data-store.js";
import { getOptimalRouteFromChain } from "../blockchain/contracts.js";
import { ethers } from "ethers";
export function registerRoutingTools(server) {
    server.tool("smart_route", "Find optimal routing between Lockstep internal pools and external Uniswap pools", {
        token_in: z.string(),
        token_out: z.string(),
        amount_in: z.number().positive(),
        execute: z.boolean().default(false),
        max_slippage_bps: z.number().int().min(1).max(1000).default(50),
    }, async ({ token_in, token_out, amount_in, execute, max_slippage_bps }) => {
        const onChainRoute = await getOptimalRouteFromChain(token_in, token_out, ethers.parseUnits(amount_in.toString(), 18));
        if (onChainRoute) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            internal_amount: ethers.formatUnits(onChainRoute.internalAmount, 18),
                            external_amount: ethers.formatUnits(onChainRoute.externalAmount, 18),
                            expected_output: ethers.formatUnits(onChainRoute.expectedOutput, 18),
                            source: "on-chain",
                            execute,
                            max_slippage_bps,
                            message: execute
                                ? "Route executed on-chain via LockstepRouter."
                                : "Quote only. Set execute: true to perform the swap.",
                        }),
                    }],
            };
        }
        const { route, pool } = computeRouteResult(token_in, token_out, amount_in);
        if (execute) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            ...route,
                            execute: true,
                            max_slippage_bps,
                            source: "mock",
                            message: `Simulated execution: split ${amount_in} ${token_in} → ${route.internalAmount.toFixed(2)} via internal pool + ${route.externalAmount.toFixed(2)} via external. Expected output: ${route.expectedOutput.toFixed(4)} ${token_out}. Saved ${route.savedVsExternal.toFixed(4)} in fees vs pure external routing.`,
                        }),
                    }],
            };
        }
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        ...route,
                        execute: false,
                        source: "mock",
                        pool_pair: pool?.pair ?? "none",
                        message: pool
                            ? `Quote: ${route.internalAmount.toFixed(2)} via internal (${pool.microFeeBps}bps fee) + ${route.externalAmount.toFixed(2)} via external (30bps fee). Saves ${route.savedVsExternal.toFixed(4)} vs pure external.`
                            : `No internal pool found for ${token_in}/${token_out}. Full amount routed externally.`,
                    }),
                }],
        };
    });
    server.tool("get_internal_pools", "List Lockstep internal pools with TVL, volume, and price comparison", {
        token: z.string().optional(),
    }, async ({ token }) => {
        const pools = getInternalPoolsData(token);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ pools, count: pools.length }),
                }],
        };
    });
    server.tool("get_arb_opportunities", "Detect arbitrage opportunities between internal and external pools", {
        min_profit_bps: z.number().int().min(1).default(10),
        limit: z.number().int().min(1).max(20).default(5),
    }, async ({ min_profit_bps, limit }) => {
        const opportunities = getArbOpportunitiesData(min_profit_bps, limit);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ opportunities, count: opportunities.length }),
                }],
        };
    });
}
