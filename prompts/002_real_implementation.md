# 002 — Real implementation: rewrite MCP server with actual chain reads/writes

The current MCP server (`server/src/`) is a simulation:

- `data-store.ts` exports 6 hardcoded `TradingAgentProposal` entries (`prop-001` through `prop-006`), 4 fake `InternalPool` entries, fake leaderboard, fake protocol stats, fake positions. The "tools" read from this in-memory store and pretend it's chain data.
- `blockchain/contracts.ts` declares ABIs with **wrong signatures** from before Phase 1: `getAgent(bytes32 jobId)` (it's `uint256 agentId` now), `registerAgent(...)` with parameters that don't exist on the current contract, `fileClaim(bytes32, uint256)` (real signature is 5 args). Half of these calls would revert at runtime.
- `tools/agent.ts::register_trading_agent` does **not sign any transaction**. It generates a fake `prop-${Date.now().toString(36)}` ID and returns it. Pure theater.
- `config.ts` only reads `WALLET_ADDRESS` (a read-only address). There is no `PRIVATE_KEY` handling and no `ethers.Wallet` instantiation anywhere. The server cannot send transactions even in principle.

This prompt replaces all of that. After this prompt the MCP server:

1. Reads the real chain via ethers.js using the same ABIs that the backend (`packages/backend/src/abi/`) and the frontend (`packages/frontend/src/lib/contracts.ts`) consume.
2. Signs and broadcasts real transactions for write tools, using **per-actor private keys** loaded from env (so the same MCP can act as trading agent, investor, or admin depending on which tool is called, with separate keys for separation of concerns).
3. Has zero mocks. Zero `data-store.ts`. Zero hardcoded data.
4. Returns clear error messages when an env var is missing instead of falling back to fake data.

## Reglas

- **NO mocks, NO fallback data, NO `data-store.ts`**. Delete the file entirely.
- **NO inventes funciones**. Read `../lockstep/packages/contracts/src/` for real signatures. The backend prompt 010 already extracted them — you can also reuse the ABIs from `../lockstep/packages/backend/src/abi/` directly.
- **NO añadas autenticación al MCP transport**. It's stdio, single-process, single-user. The protection is at the env var level (don't expose private keys).
- **NO toques los `prompts/` ni el `examples/` ni el `README.md`**. Solo `server/`.
- **NO añadas dependencias** que no sean ethers + zod + el SDK MCP (ya instaladas).
- Lo único que para el flujo: errores de TypeScript en `npm run build` desde `server/`.

## Cambio 1 — Borrar el simulacro

Delete completely:

- `server/src/data-store.ts` (hardcoded mocks)
- `server/src/types.ts` if it only contains types used by `data-store.ts`. If it has reusable types (`Address`, `JobId`), keep those.

Update `server/src/index.ts` to remove imports of any deleted file.

## Cambio 2 — `server/src/config.ts` con per-actor keys

Replace the current `config.ts` with:

```ts
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

export interface Config {
  rpcUrl: string;
  registryAddress: string;
  hookAddress: string;
  internalHookAddress: string;
  routerAddress: string;
  escrowAddress: string;
  evaluatorAddress: string;
  vaultAddress: string;
  evalRegistryAddress: string;
}

export type ActorRole = "trading_agent" | "investor" | "admin" | "default";

const REQUIRED = [
  "RPC_URL",
  "LOCKSTEP_REGISTRY_ADDRESS",
  "LOCKSTEP_HOOK_ADDRESS",
  "LOCKSTEP_INTERNAL_HOOK_ADDRESS",
  "LOCKSTEP_ROUTER_ADDRESS",
  "LOCKSTEP_ESCROW_ADDRESS",
  "LOCKSTEP_EVALUATOR_ADDRESS",
  "LOCKSTEP_VAULT_ADDRESS",
  "LOCKSTEP_EVAL_REGISTRY_ADDRESS",
] as const;

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`[mcp] Missing required env var: ${key}`);
  }
}

export function getConfig(): Config {
  return {
    rpcUrl: process.env.RPC_URL!,
    registryAddress: process.env.LOCKSTEP_REGISTRY_ADDRESS!,
    hookAddress: process.env.LOCKSTEP_HOOK_ADDRESS!,
    internalHookAddress: process.env.LOCKSTEP_INTERNAL_HOOK_ADDRESS!,
    routerAddress: process.env.LOCKSTEP_ROUTER_ADDRESS!,
    escrowAddress: process.env.LOCKSTEP_ESCROW_ADDRESS!,
    evaluatorAddress: process.env.LOCKSTEP_EVALUATOR_ADDRESS!,
    vaultAddress: process.env.LOCKSTEP_VAULT_ADDRESS!,
    evalRegistryAddress: process.env.LOCKSTEP_EVAL_REGISTRY_ADDRESS!,
  };
}

let providerInstance: ethers.JsonRpcProvider | null = null;
export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(getConfig().rpcUrl);
  }
  return providerInstance;
}

const ENV_KEY_BY_ROLE: Record<ActorRole, string> = {
  trading_agent: "TRADING_AGENT_PRIVATE_KEY",
  investor: "INVESTOR_PRIVATE_KEY",
  admin: "ADMIN_PRIVATE_KEY",
  default: "MCP_PRIVATE_KEY",
};

const walletCache = new Map<ActorRole, ethers.Wallet>();

export function getSigner(role: ActorRole): ethers.Wallet {
  if (walletCache.has(role)) return walletCache.get(role)!;

  const envKey = ENV_KEY_BY_ROLE[role];
  let pk = process.env[envKey];

  // Fall back to MCP_PRIVATE_KEY for any role if the specific one isn't set
  if (!pk && role !== "default") {
    pk = process.env[ENV_KEY_BY_ROLE.default];
  }

  if (!pk) {
    throw new Error(
      `[mcp] No private key configured for role '${role}'. Set ${envKey} or MCP_PRIVATE_KEY in the environment.`,
    );
  }

  const wallet = new ethers.Wallet(pk, getProvider());
  walletCache.set(role, wallet);
  return wallet;
}
```

The `getSigner(role)` pattern means each tool declares which actor it represents and the env var validation only happens when that tool is invoked, not at startup. This is intentional: you can run the MCP read-only without any private keys configured.

## Cambio 3 — `server/src/blockchain/contracts.ts` con ABIs reales

Replace entirely. Use Human Readable ethers ABIs, identical signatures to those in `../lockstep/packages/backend/src/abi/` (already extracted in prompt 010 — read those files and copy literally).

Structure:

```ts
import { ethers } from "ethers";
import { getConfig, getProvider, getSigner, type ActorRole } from "../config.js";

const REGISTRY_ABI = [
  // Copy from ../lockstep/packages/backend/src/abi/registry.ts
] as const;

const HOOK_ABI = [...] as const;
const INTERNAL_HOOK_ABI = [...] as const;
const ROUTER_ABI = [...] as const;
const ESCROW_ABI = [...] as const;
const EVALUATOR_ABI = [...] as const;
const VAULT_ABI = [...] as const;
const EVAL_REGISTRY_ABI = [...] as const;

// ─── Read-only contract instances (singleton, shared provider) ────────────

export function getRegistry(): ethers.Contract {
  return new ethers.Contract(getConfig().registryAddress, REGISTRY_ABI, getProvider());
}

export function getHook(): ethers.Contract {
  return new ethers.Contract(getConfig().hookAddress, HOOK_ABI, getProvider());
}

export function getVault(): ethers.Contract {
  return new ethers.Contract(getConfig().vaultAddress, VAULT_ABI, getProvider());
}

export function getEvaluator(): ethers.Contract {
  return new ethers.Contract(getConfig().evaluatorAddress, EVALUATOR_ABI, getProvider());
}

export function getEvalRegistry(): ethers.Contract {
  return new ethers.Contract(getConfig().evalRegistryAddress, EVAL_REGISTRY_ABI, getProvider());
}

export function getEscrow(): ethers.Contract {
  return new ethers.Contract(getConfig().escrowAddress, ESCROW_ABI, getProvider());
}

export function getInternalHook(): ethers.Contract {
  return new ethers.Contract(getConfig().internalHookAddress, INTERNAL_HOOK_ABI, getProvider());
}

export function getRouter(): ethers.Contract {
  return new ethers.Contract(getConfig().routerAddress, ROUTER_ABI, getProvider());
}

// ─── Writable contract instances (require a signer for the actor) ────────

export function getRegistryAs(role: ActorRole): ethers.Contract {
  return getRegistry().connect(getSigner(role)) as ethers.Contract;
}

export function getVaultAs(role: ActorRole): ethers.Contract {
  return getVault().connect(getSigner(role)) as ethers.Contract;
}

export function getEvaluatorAs(role: ActorRole): ethers.Contract {
  return getEvaluator().connect(getSigner(role)) as ethers.Contract;
}

export function getEvalRegistryAs(role: ActorRole): ethers.Contract {
  return getEvalRegistry().connect(getSigner(role)) as ethers.Contract;
}
```

Delete the old `blockchain/events.ts` if it imports from `data-store.ts`. Live event subscriptions are not the MCP's job — the backend indexer does that. If there's a useful helper there (e.g., parseLogArgs), keep just that and clean up the rest.

## Cambio 4 — Tool layer: read tools

For each tool file in `server/src/tools/`, rewrite the read tools to call ethers contracts directly. No more `data-store.ts` imports.

### `tools/marketplace.ts`

Two tools:

- **`list_agents`** — Iterates `getAgent(1..nextAgentId-1)`, filters out zero-owner entries, returns the array. Use `nextAgentId()` to get the upper bound.
- **`get_agent_details`** — Takes `agent_id: number`, returns the full struct from `getAgent(id)`. Include `committedCollateral` from `vault.committedCollateral(jobId)`, current `investorCount` from `hook.getJobInvestors(id).length`, and `evaluatorStake` for the assigned evaluator if known.

Both tools serialize bigints to strings (`val.toString()`) before returning.

### `tools/leaderboard.ts`

One tool:

- **`get_leaderboard`** — Calls the same iteration as `list_agents`, then for each agent reads any historical evaluation events from `evaluator.queryFilter(evaluator.filters.Evaluated())` to compute success rate and average return. If the indexer is running locally and `BACKEND_URL` is set in env, prefer hitting `${BACKEND_URL}/api/leaderboard` for speed; otherwise compute on-the-fly. Both code paths are valid; pick one consistent default and document it in the tool description.

### `tools/investor.ts`

Three tools:

- **`get_my_positions`** — Takes `wallet_address: string`. Reads `hook.investorPositions(jobId, wallet)` for every job from `1..nextAgentId`. Returns the non-zero positions with the agent name from `getAgent(jobId)`.
- **`get_my_claims`** — Takes `wallet_address: string`. Reads `vault.claims(jobId, wallet)` for every job. Returns the non-zero claims with timestamps and amounts.
- **`get_committed_collateral`** — Takes `agent_id: number`. Reads `vault.committedCollateral(agentId)`.

### `tools/status.ts`

One tool:

- **`get_protocol_stats`** — Reads `nextAgentId`, then iterates and aggregates: TVL (sum of `capitalManaged` of agents in Active/Funding status), active agent count, total claims filed (count of non-zero `vault.claims` across jobs), total slashed funds from `evalRegistry.totalSlashedFunds()`. This is expensive (O(n) RPC calls); if `BACKEND_URL` is set, prefer the backend's `/api/stats` endpoint.

### `tools/routing.ts` (delete or rewrite)

The current routing tools assume an internal pool layer with arbitrage opportunities computed off-chain. The real `LockstepInternalHook` has `microFeeBps` config and `LockstepRouter` has `getOptimalRoute(...)`. Rewrite to:

- **`get_optimal_route`** — Calls `router.getOptimalRoute(tokenIn, tokenOut, amountIn)` and returns the result. No mock arbitrage opportunities. If you want to keep an `arb_opportunities` tool, compute it from real Uniswap pool prices via `StateLibrary` from `@uniswap/v4-core` — but that's significant scope. Easier: drop `arb_opportunities` from the tool list and document in `FUTURE WORK` that real arbitrage detection requires a separate price oracle integration.

## Cambio 5 — Tool layer: write tools

These actually sign and broadcast transactions. Pattern for every write tool:

```ts
server.tool(
  "register_trading_agent",
  "Register the caller as a trading agent. Requires TRADING_AGENT_PRIVATE_KEY.",
  {
    name: z.string().min(1).max(64),
    strategy: z.string().min(10).max(500),
    collateral: z.string().describe("Collateral in wei (string-encoded uint256)"),
    capital_managed: z.string().describe("Capital managed in wei"),
    commitment_deadline: z.number().int().describe("Unix timestamp"),
    min_return_bps: z.number().int().min(0).max(10000),
    profit_split_investor_bps: z.number().int().min(0).max(10000),
    profit_split_agent_bps: z.number().int().min(0).max(10000),
    profit_split_protocol_bps: z.number().int().min(0).max(10000),
  },
  async (params) => {
    try {
      const registry = getRegistryAs("trading_agent");
      const tx = await registry.registerTradingAgent(
        params.name,
        params.strategy,
        BigInt(params.collateral),
        BigInt(params.capital_managed),
        BigInt(params.commitment_deadline),
        BigInt(params.min_return_bps),
        BigInt(params.profit_split_investor_bps),
        BigInt(params.profit_split_agent_bps),
        BigInt(params.profit_split_protocol_bps),
      );
      const receipt = await tx.wait();

      // Parse AgentRegistered event to get the assigned agentId
      const event = receipt?.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((parsed) => parsed?.name === "AgentRegistered");

      const agentId = event?.args?.agentId?.toString() ?? "unknown";

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            agent_id: agentId,
            tx_hash: tx.hash,
            block_number: receipt?.blockNumber,
            gas_used: receipt?.gasUsed?.toString(),
          }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        }],
        isError: true,
      };
    }
  },
);
```

All write tools follow this pattern: zod schema, try/catch, sign + send + wait + parse events for relevant return values, return tx hash + block number + gas used. On error, return `isError: true` with the error message — never silently succeed.

Write tools to implement:

**Trading agent (`tools/agent.ts`)**:
- `register_trading_agent` — `registry.registerTradingAgent(...)`, role `trading_agent`
- `deposit_collateral` — `vault.deposit{value: amount}()`, role `trading_agent`, accepts `amount` as wei string and passes as `value`
- `commit_to_job` — `vault.commitToJob(jobId, amount)`, role `trading_agent`
- `report_pnl` — Only if `LockstepRegistry.reportPnl(...)` exists in the real ABI. If not, **delete this tool** — the old version called a function that doesn't exist on the current contract. Anótalo en el reporte.

**Investor (`tools/investor.ts`)** (extending the file with write tools alongside the read ones):
- `file_claim` — `vault.fileClaim(jobId, amount, upstream, reasoningCID, slashEvidenceHash)`, role `investor`
- (Funding jobs requires the Uniswap v4 PositionManager — same `FUTURE WORK` note as in the frontend prompt 009. Don't implement it here.)

**Admin (`tools/admin.ts`)** — new file:
- `slash_evaluator` — `evalRegistry.slashEvaluator(evaluator, jobId, slashedAmount, reason)`, role `admin`
- `register_evaluator` — `evalRegistry.registerEvaluator(evaluator){value: stake}`, role `admin`
- `withdraw_evaluator_stake` — `evalRegistry.withdraw(evaluator, amount)`, role `admin`
- `set_min_stake` — `evalRegistry.setMinStake(amount)`, role `admin`
- `evaluate_job` — `evaluator.evaluate(jobId)`, role `admin` (this is normally a keeper bot, but exposing it via admin role lets a human force evaluation during testing)

Update `server/src/index.ts` to register the new `admin` tools file.

## Cambio 6 — `.env.example`

Document all new env vars. Create or update `server/.env.example`:

```
# RPC + addresses
RPC_URL=https://sepolia.base.org
LOCKSTEP_REGISTRY_ADDRESS=
LOCKSTEP_HOOK_ADDRESS=
LOCKSTEP_INTERNAL_HOOK_ADDRESS=
LOCKSTEP_ROUTER_ADDRESS=
LOCKSTEP_ESCROW_ADDRESS=
LOCKSTEP_EVALUATOR_ADDRESS=
LOCKSTEP_VAULT_ADDRESS=
LOCKSTEP_EVAL_REGISTRY_ADDRESS=

# Optional: backend API for fast aggregated reads (leaderboard, stats)
# When set, read tools prefer the backend over direct chain reads
BACKEND_URL=http://localhost:4701

# Per-actor signing keys (set only the ones you need)
# All write tools require their respective key. Read tools work without any key.
TRADING_AGENT_PRIVATE_KEY=
INVESTOR_PRIVATE_KEY=
ADMIN_PRIVATE_KEY=

# Fallback key used by any role when the specific one above is not set
MCP_PRIVATE_KEY=
```

If a real `.env` already exists in `server/`, leave its values intact and only add missing keys.

## Cambio 7 — Build & verify

```bash
cd server
npm run build
```

Build clean. No corras `node dist/index.js` desde el prompt — el MCP necesita el RPC accesible y un cliente MCP (Claude Desktop o similar) para invocar tools, ese trabajo es del usuario después.

## Reportar al terminar

1. Files deleted (especially confirm `data-store.ts` is gone).
2. Files created / modified.
3. List of read tools, with which contract/method each one calls.
4. List of write tools, grouped by actor role, with which contract/method each one calls.
5. Confirm the ABIs in `blockchain/contracts.ts` are byte-identical (or as close as possible) to `../lockstep/packages/backend/src/abi/`. Differences are red flags.
6. Confirm `npm run build` from `server/` passes.
7. **FUTURE WORK** with: real arbitrage detection via Uniswap v4 StateLibrary (the dropped `arb_opportunities`), funding tools that require the PositionManager, MCP-side event subscriptions (currently relegated to the backend indexer), prompt-level UX for guiding an LLM through registering as a trading agent end-to-end.
