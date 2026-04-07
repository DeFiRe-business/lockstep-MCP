import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllProposals, getProposalById } from "../data-store.js";
import { getAgentFromChain } from "../blockchain/contracts.js";
import type { TradingAgentProposal, EvaluationResult } from "../types.js";

export function registerMarketplaceTools(server: McpServer): void {
  server.tool(
    "list_proposals",
    "List active trading agent proposals with optional filters",
    {
      status: z.enum(["funding", "active", "completed", "failed"]).optional(),
      min_capital: z.number().optional(),
      max_capital: z.number().optional(),
      tier: z.enum(["Newcomer", "Rising", "Established", "Elite"]).optional(),
      sort_by: z.enum(["newest", "capital_desc", "return_desc", "collateral_ratio_desc"]).optional(),
      limit: z.number().min(1).max(50).optional(),
    },
    async ({ status, min_capital, max_capital, tier, sort_by, limit }) => {
      let results: TradingAgentProposal[] = getAllProposals();

      if (status) results = results.filter((p) => p.status === status);
      if (min_capital) results = results.filter((p) => p.capitalRequired >= min_capital);
      if (max_capital) results = results.filter((p) => p.capitalRequired <= max_capital);
      if (tier) results = results.filter((p) => p.tier === tier);

      const sortKey = sort_by ?? "newest";
      switch (sortKey) {
        case "newest":
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case "capital_desc":
          results.sort((a, b) => b.capitalRequired - a.capitalRequired);
          break;
        case "return_desc":
          results.sort((a, b) => {
            const aReturn = a.performanceHistory.length ? a.performanceHistory[a.performanceHistory.length - 1]!.pnlPct : 0;
            const bReturn = b.performanceHistory.length ? b.performanceHistory[b.performanceHistory.length - 1]!.pnlPct : 0;
            return bReturn - aReturn;
          });
          break;
        case "collateral_ratio_desc":
          results.sort((a, b) => b.collateralRatioBps - a.collateralRatioBps);
          break;
      }

      const finalLimit = limit ?? 10;
      results = results.slice(0, finalLimit);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ proposals: results, count: results.length }),
        }],
      };
    }
  );

  server.tool(
    "get_proposal_details",
    "Get full details of a specific trading agent proposal",
    {
      proposal_id: z.string(),
    },
    async ({ proposal_id }) => {
      const onChain = await getAgentFromChain(proposal_id);
      if (onChain) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              id: proposal_id,
              agent: onChain.agent,
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

      const proposal = getProposalById(proposal_id);
      if (!proposal) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} not found` }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ ...proposal, source: "mock" }),
        }],
      };
    }
  );

  server.tool(
    "evaluate_proposal",
    "Compute economic metrics for an investment in a proposal",
    {
      proposal_id: z.string(),
      investment_amount: z.number().positive(),
    },
    async ({ proposal_id, investment_amount }) => {
      const proposal = getProposalById(proposal_id);
      if (!proposal) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} not found` }) }],
          isError: true,
        };
      }

      const investorSharePct = proposal.profitSplitInvestorBps / 10000;
      const estimatedDailyReturnPct = (proposal.minReturnBps / 10000) / proposal.commitmentPeriodDays;
      const estimatedDailyReturn = investment_amount * estimatedDailyReturnPct * investorSharePct;
      const estimatedMonthlyReturn = estimatedDailyReturn * 30;

      const collateralRatio = proposal.collateralRatioBps / 10000;
      const riskScore = Math.max(1, Math.min(10, Math.round(10 - collateralRatio * 20)));

      const breakEvenDays = estimatedDailyReturn > 0
        ? Math.ceil(investment_amount * 0.003 / estimatedDailyReturn)
        : proposal.commitmentPeriodDays;

      const evaluation: EvaluationResult = {
        proposalId: proposal_id,
        investmentAmount: investment_amount,
        estimatedDailyReturn,
        estimatedMonthlyReturn,
        riskScore,
        breakEvenDays,
        comparisonVsSimilar: `This proposal offers ${proposal.minReturnBps}bps min return with ${proposal.collateralRatioBps}bps collateral ratio. Tier: ${proposal.tier}.`,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(evaluation) }],
      };
    }
  );
}
