import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAgentStatus } from "../data-store.js";
import { getAgentFromChain } from "../blockchain/contracts.js";

const MIN_COLLATERAL_RATIO_BPS: Record<string, number> = {
  Newcomer: 1500,
  Rising: 1200,
  Established: 1000,
  Elite: 800,
};

export function registerAgentTools(server: McpServer): void {
  server.tool(
    "register_trading_agent",
    "Register as a trading agent on the Lockstep protocol",
    {
      name: z.string().min(1).max(64),
      strategy_description: z.string().min(10).max(500),
      capital_required: z.number().positive(),
      collateral_amount: z.number().positive(),
      commitment_period_days: z.number().int().min(7).max(365),
      min_return_bps: z.number().int().min(0).max(10000),
      profit_split_investor_bps: z.number().int().min(1000).max(9500),
    },
    async ({ name, strategy_description, capital_required, collateral_amount, commitment_period_days, min_return_bps, profit_split_investor_bps }) => {
      const collateralRatioBps = Math.round((collateral_amount / capital_required) * 10000);
      const tier = "Newcomer";
      const minRequired = MIN_COLLATERAL_RATIO_BPS[tier]!;

      if (collateralRatioBps < minRequired) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: `Collateral ratio ${collateralRatioBps}bps is below minimum ${minRequired}bps for ${tier} tier. Increase collateral to at least ${(capital_required * minRequired) / 10000}.`,
            }),
          }],
          isError: true,
        };
      }

      const agentId = `prop-${Date.now().toString(36)}`;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "registered",
            agent_id: agentId,
            name,
            strategy_description,
            capital_required,
            collateral_amount,
            collateral_ratio_bps: collateralRatioBps,
            commitment_period_days,
            min_return_bps,
            profit_split_investor_bps,
            tier,
            message: `Agent "${name}" registered successfully. Deposit ${collateral_amount} as collateral to activate your proposal. Investors can now fund your proposal at ${agentId}.`,
          }),
        }],
      };
    }
  );

  server.tool(
    "get_my_agent_status",
    "Get current status of a registered trading agent",
    {
      agent_id: z.string(),
    },
    async ({ agent_id }) => {
      const onChain = await getAgentFromChain(agent_id);
      if (onChain) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              agentId: agent_id,
              name: onChain.name,
              capital: onChain.capital.toString(),
              collateral: onChain.collateral.toString(),
              pnl: onChain.pnl.toString(),
              status: onChain.status,
              source: "on-chain",
            }),
          }],
        };
      }

      const status = getAgentStatus(agent_id);
      if (!status) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Agent ${agent_id} not found` }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...status, source: "mock" }) }],
      };
    }
  );

  server.tool(
    "report_pnl",
    "Submit a periodic P&L snapshot for the trading agent",
    {
      agent_id: z.string(),
      current_balance: z.number().nonnegative(),
      open_positions: z.number().int().nonnegative(),
    },
    async ({ agent_id, current_balance, open_positions }) => {
      const status = getAgentStatus(agent_id);
      if (!status) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Agent ${agent_id} not found` }) }],
          isError: true,
        };
      }

      const pnl = current_balance - status.capitalDeployed;
      const pnlPct = (pnl / status.capitalDeployed) * 100;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "pnl_reported",
            agent_id,
            current_balance,
            open_positions,
            pnl,
            pnl_pct: Math.round(pnlPct * 100) / 100,
            timestamp: new Date().toISOString(),
            message: `P&L snapshot recorded: balance=${current_balance}, pnl=${pnl} (${pnlPct.toFixed(2)}%), open_positions=${open_positions}`,
          }),
        }],
      };
    }
  );
}
