import { z } from "zod";
import { ethers } from "ethers";
import { getRegistry, getHook, getVault, getVaultAs, } from "../blockchain/contracts.js";
export function registerInvestorTools(server) {
    server.tool("get_my_positions", "List all non-zero investor positions for a given wallet across every job (1..nextAgentId-1).", {
        wallet_address: z.string().describe("Investor wallet address"),
    }, async ({ wallet_address }) => {
        try {
            const wallet = ethers.getAddress(wallet_address);
            const registry = getRegistry();
            const hook = getHook();
            const next = await registry.nextAgentId();
            const upper = Number(next);
            const positions = [];
            for (let id = 1; id < upper; id++) {
                try {
                    const amount = await hook.investorPositions(BigInt(id), wallet);
                    if (amount === 0n)
                        continue;
                    const raw = await registry.getAgent(BigInt(id));
                    positions.push({
                        agent_id: id.toString(),
                        agent_name: raw.name,
                        amount: amount.toString(),
                    });
                }
                catch {
                    // skip
                }
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ wallet, positions, count: positions.length }, null, 2),
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
    server.tool("get_my_claims", "List all non-zero claims filed by a wallet across every job. Reads CollateralVault.claims(jobId, wallet).", {
        wallet_address: z.string(),
    }, async ({ wallet_address }) => {
        try {
            const wallet = ethers.getAddress(wallet_address);
            const registry = getRegistry();
            const vault = getVault();
            const next = await registry.nextAgentId();
            const upper = Number(next);
            const claims = [];
            for (let id = 1; id < upper; id++) {
                try {
                    const c = await vault.claims(BigInt(id), wallet);
                    if (c.amount === 0n)
                        continue;
                    claims.push({
                        job_id: c.jobId.toString(),
                        claimant: c.claimant,
                        amount: c.amount.toString(),
                        upstream: c.upstream,
                        reasoning_cid: c.reasoningCID,
                        slash_evidence_hash: c.slashEvidenceHash,
                        timestamp: c.timestamp.toString(),
                    });
                }
                catch {
                    // skip
                }
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({ wallet, claims, count: claims.length }, null, 2),
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
    server.tool("get_committed_collateral", "Read the committed collateral locked against a job in CollateralVault.", {
        agent_id: z.number().int().positive(),
    }, async ({ agent_id }) => {
        try {
            const vault = getVault();
            const amount = await vault.committedCollateral(BigInt(agent_id));
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            agent_id,
                            committed_collateral: amount.toString(),
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
    // ─── Write tool ───────────────────────────────────────────────────────────
    server.tool("file_claim", "File a claim against a failed job's collateral via CollateralVault.fileClaim. Requires INVESTOR_PRIVATE_KEY (or MCP_PRIVATE_KEY).", {
        job_id: z.number().int().positive(),
        amount: z.string().describe("Claim amount in wei"),
        upstream: z.string().default("0x0000000000000000000000000000000000000000000000000000000000000000").describe("Optional upstream reference (bytes32)"),
        reasoning_cid: z.string().default("0x0000000000000000000000000000000000000000000000000000000000000000").describe("Optional CID of off-chain reasoning report (bytes32)"),
        slash_evidence_hash: z.string().default("0x0000000000000000000000000000000000000000000000000000000000000000").describe("Optional slash evidence hash (bytes32). Use 0x0 if not slash-backed."),
    }, async ({ job_id, amount, upstream, reasoning_cid, slash_evidence_hash }) => {
        try {
            const vault = getVaultAs("investor");
            const tx = await vault.fileClaim(BigInt(job_id), BigInt(amount), upstream, reasoning_cid, slash_evidence_hash);
            const receipt = await tx.wait();
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            job_id,
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
                        text: JSON.stringify({
                            success: false,
                            error: err instanceof Error ? err.message : String(err),
                        }),
                    }],
                isError: true,
            };
        }
    });
}
