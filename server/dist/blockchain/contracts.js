import { ethers } from "ethers";
import { getConfig, getProvider, getSigner } from "../config.js";
// ─── ABIs ─────────────────────────────────────────────────────────────────────
//
// Events are kept byte-identical to ../lockstep/packages/backend/src/abi/.
// Function signatures (which the backend indexer doesn't need) are added here
// from the real Solidity sources in ../lockstep/packages/contracts/src/.
export const REGISTRY_ABI = [
    "function getAgent(uint256 agentId) view returns (tuple(address owner, string name, string strategy, uint256 collateral, uint256 capitalManaged, uint256 commitmentDeadline, uint256 minReturnBps, uint256 profitSplitInvestorBps, uint256 profitSplitAgentBps, uint256 profitSplitProtocolBps, uint8 tier, uint8 status))",
    "function nextAgentId() view returns (uint256)",
    "function isRegisteredAgent(address) view returns (bool)",
    "function registerTradingAgent(string name, string strategy, uint256 collateral, uint256 capitalManaged, uint256 commitmentDeadline, uint256 minReturnBps, uint256 profitSplitInvestorBps, uint256 profitSplitAgentBps, uint256 profitSplitProtocolBps) returns (uint256)",
    "function updateStatus(uint256 agentId, uint8 newStatus)",
    "event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, uint8 tier)",
    "event StatusUpdated(uint256 indexed agentId, uint8 oldStatus, uint8 newStatus)",
];
export const HOOK_ABI = [
    "function investorPositions(uint256 jobId, address investor) view returns (uint256)",
    "function totalJobLiquidity(uint256 jobId) view returns (uint256)",
    "function getJobInvestors(uint256 jobId) view returns (address[])",
    "function poolToJob(bytes32 poolId) view returns (uint256)",
    "event InvestorFunded(uint256 indexed jobId, address indexed investor, uint256 amount)",
    "event EarlyExit(uint256 indexed jobId, address indexed investor, uint256 amount)",
    "event JobCompleted(uint256 indexed jobId, uint256 finalBalance)",
    "event JobFailed(uint256 indexed jobId, uint256 finalBalance)",
    "event ProfitDistributed(uint256 indexed jobId, uint256 investorShare, uint256 agentShare, uint256 protocolShare)",
];
export const INTERNAL_HOOK_ABI = [
    "function microFeeBps() view returns (uint256)",
    "function protocolTreasury() view returns (address)",
    "function setMicroFee(uint256 newFeeBps)",
    "event InternalFeeCollected(address indexed sender, bytes32 indexed poolId, uint256 fee, address treasury)",
    "event MicroFeeUpdated(uint256 oldFee, uint256 newFee)",
];
export const ROUTER_ABI = [
    "function getOptimalRoute(address tokenIn, address tokenOut, uint256 amountIn, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) internalPool, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) externalPool) view returns (tuple(uint256 internalAmount, uint256 externalAmount, uint256 expectedOutput, uint256 totalFeeCost, uint256 savedVsExternal))",
    "function executeRoute(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 internalSplitBps, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) internalPool, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) externalPool) returns (uint256)",
    "event RouteExecuted(address indexed trader, uint256 internalAmount, uint256 externalAmount, uint256 totalOutput)",
];
export const ESCROW_ABI = [
    "function jobBalances(uint256 jobId) view returns (uint256)",
    "function deposit(uint256 jobId) payable",
    "event Deposited(uint256 indexed jobId, uint256 amount)",
    "event Released(uint256 indexed jobId, address indexed recipient, uint256 amount)",
    "event SwapExecuted(uint256 indexed jobId, uint256 amountIn)",
];
export const EVALUATOR_ABI = [
    "function finalBalance(uint256 jobId) view returns (uint256)",
    "function evaluate(uint256 jobId)",
    "event Evaluated(uint256 indexed jobId, bool success, uint256 finalBalance, uint256 minExpected)",
];
export const VAULT_ABI = [
    "function deposits(address agent) view returns (uint256)",
    "function committedCollateral(uint256 jobId) view returns (uint256)",
    "function claims(uint256 jobId, address investor) view returns (tuple(uint256 jobId, address claimant, uint256 amount, bytes32 upstream, bytes32 reasoningCID, bytes32 slashEvidenceHash, uint256 timestamp))",
    "function deposit() payable",
    "function commitToJob(uint256 jobId, uint256 amount)",
    "function fileClaim(uint256 jobId, uint256 amount, bytes32 upstream, bytes32 reasoningCID, bytes32 slashEvidenceHash)",
    "event Deposited(address indexed agent, uint256 amount)",
    "event CommittedToJob(uint256 indexed jobId, uint256 amount)",
    "event CollateralReleased(uint256 indexed jobId, uint256 amount)",
    "event ClaimFiled(uint256 indexed jobId, address indexed investor, uint256 amount, bytes32 upstream, bytes32 reasoningCID, bytes32 slashEvidenceHash)",
];
export const EVAL_REGISTRY_ABI = [
    "function minStake() view returns (uint256)",
    "function totalSlashedFunds() view returns (uint256)",
    "function slashCount() view returns (uint256)",
    "function evaluators(address) view returns (uint256 stake, bool active, uint256 registeredAt)",
    "function getEvaluator(address evaluator) view returns (tuple(uint256 stake, bool active, uint256 registeredAt))",
    "function getSlashRecord(uint256 jobId) view returns (tuple(address evaluator, uint256 jobId, uint256 slashedAmount, bytes32 reason, uint256 timestamp))",
    "function buildEvidenceHash(uint256 jobId) view returns (bytes32)",
    "function setMinStake(uint256 newMinStake)",
    "function registerEvaluator(address evaluator) payable",
    "function withdraw(address evaluator, uint256 amount)",
    "function slashEvaluator(address evaluator, uint256 jobId, uint256 slashedAmount, bytes32 reason)",
    "event EvaluatorRegistered(address indexed evaluator, uint256 stake)",
    "event EvaluatorStakeIncreased(address indexed evaluator, uint256 added, uint256 newTotal)",
    "event EvaluatorWithdrawn(address indexed evaluator, uint256 amount, uint256 remainingStake)",
    "event EvaluatorSlashed(address indexed evaluator, uint256 indexed jobId, uint256 slashedAmount, bytes32 reason)",
    "event MinStakeUpdated(uint256 oldMinStake, uint256 newMinStake)",
];
// ─── Read-only contract instances (singleton, shared provider) ────────────────
export function getRegistry() {
    return new ethers.Contract(getConfig().registryAddress, REGISTRY_ABI, getProvider());
}
export function getHook() {
    return new ethers.Contract(getConfig().hookAddress, HOOK_ABI, getProvider());
}
export function getInternalHook() {
    return new ethers.Contract(getConfig().internalHookAddress, INTERNAL_HOOK_ABI, getProvider());
}
export function getRouter() {
    return new ethers.Contract(getConfig().routerAddress, ROUTER_ABI, getProvider());
}
export function getEscrow() {
    return new ethers.Contract(getConfig().escrowAddress, ESCROW_ABI, getProvider());
}
export function getEvaluator() {
    return new ethers.Contract(getConfig().evaluatorAddress, EVALUATOR_ABI, getProvider());
}
export function getVault() {
    return new ethers.Contract(getConfig().vaultAddress, VAULT_ABI, getProvider());
}
export function getEvalRegistry() {
    return new ethers.Contract(getConfig().evalRegistryAddress, EVAL_REGISTRY_ABI, getProvider());
}
// ─── Writable contract instances (require a signer for the actor) ─────────────
export function getRegistryAs(role) {
    return getRegistry().connect(getSigner(role));
}
export function getVaultAs(role) {
    return getVault().connect(getSigner(role));
}
export function getEvaluatorAs(role) {
    return getEvaluator().connect(getSigner(role));
}
export function getEvalRegistryAs(role) {
    return getEvalRegistry().connect(getSigner(role));
}
export function getRouterAs(role) {
    return getRouter().connect(getSigner(role));
}
export function getInternalHookAs(role) {
    return getInternalHook().connect(getSigner(role));
}
// ─── Enum helpers (mirror ILockstepRegistry.Status / Tier) ────────────────────
export const STATUS_NAMES = ["Funding", "Active", "Completed", "Failed"];
export const TIER_NAMES = ["Newcomer", "Verified", "Established"];
export function statusName(s) {
    const i = Number(s);
    return STATUS_NAMES[i] ?? `Unknown(${i})`;
}
export function tierName(t) {
    const i = Number(t);
    return TIER_NAMES[i] ?? `Unknown(${i})`;
}
