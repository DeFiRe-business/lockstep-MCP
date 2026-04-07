import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class LockstepClient {
  private client: Client;
  private connected = false;

  constructor() {
    this.client = new Client({ name: "lockstep-trading-agent", version: "0.1.0" });
  }

  async connect(serverCommand: string, args: string[] = []): Promise<void> {
    const transport = new StdioClientTransport({ command: serverCommand, args });
    await this.client.connect(transport);
    this.connected = true;
  }

  private async call(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) throw new Error("Not connected to Lockstep MCP");
    const result = await this.client.callTool({ name: toolName, arguments: params });
    const content = result.content as Array<{ type: string; text: string }>;
    if (!content.length) throw new Error(`Empty response from ${toolName}`);
    return JSON.parse(content[0]!.text);
  }

  async listProposals(filters: {
    status?: string;
    min_capital?: number;
    max_capital?: number;
    tier?: string;
    sort_by?: string;
    limit?: number;
  } = {}): Promise<unknown> {
    return this.call("list_proposals", filters);
  }

  async getProposalDetails(proposalId: string): Promise<unknown> {
    return this.call("get_proposal_details", { proposal_id: proposalId });
  }

  async evaluateProposal(proposalId: string, investmentAmount: number): Promise<unknown> {
    return this.call("evaluate_proposal", { proposal_id: proposalId, investment_amount: investmentAmount });
  }

  async registerAgent(params: {
    name: string;
    strategy_description: string;
    capital_required: number;
    collateral_amount: number;
    commitment_period_days: number;
    min_return_bps: number;
    profit_split_investor_bps: number;
  }): Promise<unknown> {
    return this.call("register_trading_agent", params);
  }

  async getAgentStatus(agentId: string): Promise<unknown> {
    return this.call("get_my_agent_status", { agent_id: agentId });
  }

  async reportPnl(agentId: string, currentBalance: number, openPositions: number): Promise<unknown> {
    return this.call("report_pnl", { agent_id: agentId, current_balance: currentBalance, open_positions: openPositions });
  }

  async smartRoute(params: {
    token_in: string;
    token_out: string;
    amount_in: number;
    execute?: boolean;
    max_slippage_bps?: number;
  }): Promise<unknown> {
    return this.call("smart_route", params);
  }

  async getInternalPools(token?: string): Promise<unknown> {
    return this.call("get_internal_pools", token ? { token } : {});
  }

  async getArbOpportunities(minProfitBps: number = 10, limit: number = 5): Promise<unknown> {
    return this.call("get_arb_opportunities", { min_profit_bps: minProfitBps, limit });
  }

  async getLeaderboard(period: string = "30d", sortBy: string = "return", limit: number = 10): Promise<unknown> {
    return this.call("get_leaderboard", { period, sort_by: sortBy, limit });
  }

  async getProtocolStats(): Promise<unknown> {
    return this.call("get_protocol_stats", {});
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}
