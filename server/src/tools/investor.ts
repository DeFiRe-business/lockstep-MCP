import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProposalById, getOpenPositions } from "../data-store.js";
import { getConfig } from "../config.js";

export function registerInvestorTools(server: McpServer): void {
  server.tool(
    "fund_proposal",
    "Deposit capital to back a trading agent proposal",
    {
      proposal_id: z.string(),
      amount: z.number().positive(),
      token: z.string(),
    },
    async ({ proposal_id, amount, token }) => {
      const proposal = getProposalById(proposal_id);
      if (!proposal) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} not found` }) }],
          isError: true,
        };
      }

      if (proposal.status !== "funding") {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} is not accepting funding (status: ${proposal.status})` }) }],
          isError: true,
        };
      }

      const remaining = proposal.capitalRequired - proposal.capitalRaised;
      if (amount > remaining) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Amount ${amount} exceeds remaining capacity ${remaining}` }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "pending_tx",
            proposal_id,
            amount,
            token,
            message: `To fund this proposal, approve and send ${amount} ${token} to the Lockstep Hook contract. Use your wallet to sign the transaction.`,
            remaining_after: remaining - amount,
          }),
        }],
      };
    }
  );

  server.tool(
    "get_my_positions",
    "Get all active investment positions for the connected wallet",
    {
      track: z.string().optional(),
    },
    async () => {
      const config = getConfig();
      const wallet = config.walletAddress ?? "0xDEMO";
      const positions = getOpenPositions(wallet);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ wallet, positions, count: positions.length }),
        }],
      };
    }
  );

  server.tool(
    "withdraw_position",
    "Withdraw from an investment position (may incur early exit penalties)",
    {
      proposal_id: z.string(),
      amount: z.number().positive(),
      confirm_early_exit: z.boolean().optional(),
    },
    async ({ proposal_id, amount, confirm_early_exit }) => {
      const proposal = getProposalById(proposal_id);
      if (!proposal) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} not found` }) }],
          isError: true,
        };
      }

      const isEarlyExit = proposal.status === "active";

      if (isEarlyExit && !confirm_early_exit) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              warning: "Early withdrawal detected. You will forfeit your profit share for this cycle. Set confirm_early_exit: true to proceed.",
              proposal_id,
              amount,
              penalty: "forfeit_profit_share",
            }),
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "pending_tx",
            proposal_id,
            amount,
            early_exit: isEarlyExit,
            message: isEarlyExit
              ? `Withdrawing ${amount} with early exit penalty (profit share forfeited). Sign the transaction to proceed.`
              : `Withdrawing ${amount} from completed proposal. Sign the transaction to proceed.`,
          }),
        }],
      };
    }
  );

  server.tool(
    "file_claim",
    "File a claim against a failed agent's collateral via ERC-8210",
    {
      proposal_id: z.string(),
      claim_amount: z.number().positive(),
    },
    async ({ proposal_id, claim_amount }) => {
      const proposal = getProposalById(proposal_id);
      if (!proposal) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Proposal ${proposal_id} not found` }) }],
          isError: true,
        };
      }

      if (proposal.status !== "failed") {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Claims can only be filed against failed proposals. Current status: ${proposal.status}` }) }],
          isError: true,
        };
      }

      const maxClaim = proposal.collateralAmount;
      if (claim_amount > maxClaim) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Claim amount ${claim_amount} exceeds available collateral ${maxClaim}` }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            status: "claim_submitted",
            proposal_id,
            claim_amount,
            collateral_available: maxClaim,
            message: `Claim of ${claim_amount} filed against proposal ${proposal_id}. The evaluator will process this claim against the agent's collateral of ${maxClaim}.`,
          }),
        }],
      };
    }
  );
}
