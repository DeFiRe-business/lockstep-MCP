import { z } from "zod";
import { getEvalRegistryAs, getEvaluatorAs, } from "../blockchain/contracts.js";
export function registerAdminTools(server) {
    server.tool("register_evaluator", "Register (or top up) an evaluator on LockstepEvaluatorRegistry. onlyOwner — requires ADMIN_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        evaluator: z.string().describe("Evaluator EOA / contract address"),
        stake: z.string().describe("Stake to send in wei"),
    }, async ({ evaluator, stake }) => {
        try {
            const reg = getEvalRegistryAs("admin");
            const tx = await reg.registerEvaluator(evaluator, { value: BigInt(stake) });
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            evaluator,
                            stake,
                            tx_hash: tx.hash,
                            block_number: receipt?.blockNumber,
                            gas_used: receipt?.gasUsed?.toString(),
                        }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
    server.tool("withdraw_evaluator_stake", "Withdraw stake from an evaluator. onlyOwner. Requires ADMIN_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        evaluator: z.string(),
        amount: z.string().describe("Amount in wei to withdraw"),
    }, async ({ evaluator, amount }) => {
        try {
            const reg = getEvalRegistryAs("admin");
            const tx = await reg.withdraw(evaluator, BigInt(amount));
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            evaluator,
                            amount,
                            tx_hash: tx.hash,
                            block_number: receipt?.blockNumber,
                            gas_used: receipt?.gasUsed?.toString(),
                        }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
    server.tool("slash_evaluator", "Slash an evaluator's stake for a specific jobId. Records a SlashRecord and emits EvaluatorSlashed. onlyOwner. Requires ADMIN_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        evaluator: z.string(),
        job_id: z.number().int().positive(),
        slashed_amount: z.string().describe("Amount in wei to slash"),
        reason: z.string().describe("Reason as bytes32 (e.g., 0x... — pad/keccak yourself)"),
    }, async ({ evaluator, job_id, slashed_amount, reason }) => {
        try {
            const reg = getEvalRegistryAs("admin");
            const tx = await reg.slashEvaluator(evaluator, BigInt(job_id), BigInt(slashed_amount), reason);
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            evaluator,
                            job_id,
                            slashed_amount,
                            reason,
                            tx_hash: tx.hash,
                            block_number: receipt?.blockNumber,
                            gas_used: receipt?.gasUsed?.toString(),
                        }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
    server.tool("set_min_stake", "Update the LockstepEvaluatorRegistry minimum stake. onlyOwner. Requires ADMIN_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        min_stake: z.string().describe("New minimum stake in wei"),
    }, async ({ min_stake }) => {
        try {
            const reg = getEvalRegistryAs("admin");
            const tx = await reg.setMinStake(BigInt(min_stake));
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            min_stake,
                            tx_hash: tx.hash,
                            block_number: receipt?.blockNumber,
                            gas_used: receipt?.gasUsed?.toString(),
                        }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
    server.tool("evaluate_job", "Force-trigger PerformanceEvaluator.evaluate(jobId). Normally called by a keeper bot at the commitment deadline; exposed via the admin role for manual testing. Requires ADMIN_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        job_id: z.number().int().positive(),
    }, async ({ job_id }) => {
        try {
            const ev = getEvaluatorAs("admin");
            const tx = await ev.evaluate(BigInt(job_id));
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            job_id,
                            tx_hash: tx.hash,
                            block_number: receipt?.blockNumber,
                            gas_used: receipt?.gasUsed?.toString(),
                        }, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
                    }],
                isError: true,
            };
        }
    });
}
