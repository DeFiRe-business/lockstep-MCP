import { z } from "zod";
import { getRouter, getInternalHook } from "../blockchain/contracts.js";
const PoolKeySchema = z.object({
    currency0: z.string(),
    currency1: z.string(),
    fee: z.number().int().nonnegative(),
    tick_spacing: z.number().int(),
    hooks: z.string(),
});
function toPoolKeyTuple(p) {
    return {
        currency0: p.currency0,
        currency1: p.currency1,
        fee: p.fee,
        tickSpacing: p.tick_spacing,
        hooks: p.hooks,
    };
}
export function registerRoutingTools(server) {
    server.tool("get_optimal_route", "Quote the LockstepRouter's optimal split between an internal Lockstep pool and an external Uniswap pool. Read-only — no transaction. Caller supplies both PoolKeys.", {
        token_in: z.string(),
        token_out: z.string(),
        amount_in: z.string().describe("Amount in (wei, string-encoded uint256)"),
        internal_pool: PoolKeySchema,
        external_pool: PoolKeySchema,
    }, async ({ token_in, token_out, amount_in, internal_pool, external_pool }) => {
        try {
            const router = getRouter();
            const result = await router.getOptimalRoute(token_in, token_out, BigInt(amount_in), toPoolKeyTuple(internal_pool), toPoolKeyTuple(external_pool));
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            internal_amount: result.internalAmount.toString(),
                            external_amount: result.externalAmount.toString(),
                            expected_output: result.expectedOutput.toString(),
                            total_fee_cost: result.totalFeeCost.toString(),
                            saved_vs_external: result.savedVsExternal.toString(),
                        }, null, 2),
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
    server.tool("get_internal_hook_config", "Read the LockstepInternalHook configuration: micro fee in bps and protocol treasury address.", {}, async () => {
        try {
            const hook = getInternalHook();
            const [microFeeBps, treasury] = await Promise.all([
                hook.microFeeBps(),
                hook.protocolTreasury(),
            ]);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            micro_fee_bps: microFeeBps.toString(),
                            protocol_treasury: treasury,
                        }, null, 2),
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
