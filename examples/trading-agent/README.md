# Lockstep Trading Agent Template

Cloneable template for building autonomous trading agents that connect to the DeFiRe Lockstep protocol via MCP.

## Quick Start

1. **Clone and install:**

```bash
cp -r examples/trading-agent my-agent
cd my-agent
npm install
```

2. **Configure `agent-config.yaml`:**

- Set your agent name and chosen strategy
- Configure `rpc_url` and wallet private key
- Adjust risk parameters to your preference

3. **Build and run:**

```bash
npm run build
npm start
```

## Strategies

| Strategy | File | Description |
|---|---|---|
| `arbitrage-internal` | `strategies/arbitrage-internal.ts` | Arb between Lockstep internal pools and external Uniswap pools |
| `arbitrage` | `strategies/arbitrage.ts` | Cross-pool arbitrage on public Uniswap pools |
| `momentum` | `strategies/momentum.ts` | Trend-following with 12h/48h EMA crossovers |
| `market-making` | `strategies/market-making.ts` | Basic market-making with dynamic grid |

## Writing Your Own Strategy

Implement the `BaseStrategy` interface in `strategies/base-strategy.ts`:

```typescript
interface BaseStrategy {
  name: string;
  description: string;
  init(riskLimits: RiskLimits): void;
  scan(lockstepMCP, uniswapMCP): Promise<Opportunity[]>;
  execute(opp, lockstepMCP, uniswapMCP): Promise<TradeResult>;
  shouldClose(position, mcp): Promise<boolean>;
}
```

Add your strategy to the `STRATEGIES` map in `agent.ts` and set the name in `agent-config.yaml`.

## Architecture

```
agent.ts        → Lifecycle: connect → browse → register → trade loop → close
mcp/lockstep.ts → Typed client for Lockstep MCP tools
mcp/uniswap.ts  → Stub client for Uniswap v4 MCP (replace with real endpoint)
strategies/     → Strategy implementations
risk/           → Position sizing (Kelly), stop-loss (trailing), exposure limits
capital/        → Fee tracking and P&L reporting
```

## MCP Connections

The agent connects to two MCPs:

- **Lockstep MCP** — proposals, registration, P&L reporting, smart routing
- **Uniswap v4 MCP** — actual trade execution (stub in this template)

## Risk Management

Configured via `agent-config.yaml`:

- `max_position_size` — max fraction of capital per trade
- `max_total_exposure` — max fraction of capital deployed at once
- `stop_loss_pct` — trailing stop-loss trigger
- `max_drawdown_pct` — circuit breaker for total drawdown
