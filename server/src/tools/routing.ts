import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRouter, getInternalHook } from "../blockchain/contracts.js";

const PoolKeySchema = z.object({
  currency0: z.string(),
  currency1: z.string(),
  fee: z.number().int().nonnegative(),
  tick_spacing: z.number().int(),
  hooks: z.string(),
});

type PoolKeyInput = z.infer<typeof PoolKeySchema>;

function toPoolKeyTuple(p: PoolKeyInput) {
  return {
    currency0: p.currency0,
    currency1: p.currency1,
    fee: p.fee,
    tickSpacing: p.tick_spacing,
    hooks: p.hooks,
  };
}

export function registerRoutingTools(server: McpServer): void {
  server.tool(
    "get_optimal_route",
    "Quote the LockstepRouter's optimal split between an internal Lockstep pool and an external Uniswap pool. Read-only — no transaction. Caller supplies both PoolKeys.",
    {
      token_in: z.string(),
      token_out: z.string(),
      amount_in: z.string().describe("Amount in (wei, string-encoded uint256)"),
      internal_pool: PoolKeySchema,
      external_pool: PoolKeySchema,
    },
    async ({ token_in, token_out, amount_in, internal_pool, external_pool }) => {
      try {
        const router = getRouter();
        const result = await router.getOptimalRoute(
          token_in,
          token_out,
          BigInt(amount_in),
          toPoolKeyTuple(internal_pool),
          toPoolKeyTuple(external_pool),
        );

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              internal_amount: (result.internalAmount as bigint).toString(),
              external_amount: (result.externalAmount as bigint).toString(),
              expected_output: (result.expectedOutput as bigint).toString(),
              total_fee_cost: (result.totalFeeCost as bigint).toString(),
              saved_vs_external: (result.savedVsExternal as bigint).toString(),
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
    "get_internal_hook_config",
    "Read the LockstepInternalHook configuration: micro fee in bps and protocol treasury address.",
    {},
    async () => {
      try {
        const hook = getInternalHook();
        const [microFeeBps, treasury] = await Promise.all([
          hook.microFeeBps() as Promise<bigint>,
          hook.protocolTreasury() as Promise<string>,
        ]);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              micro_fee_bps: microFeeBps.toString(),
              protocol_treasury: treasury,
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
