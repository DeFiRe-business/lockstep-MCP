export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippageBps: number;
}

export interface SwapResult {
  success: boolean;
  txHash: string | null;
  amountOut: number;
  fee: number;
}

export class UniswapClient {
  private log: Array<{ action: string; params: unknown; timestamp: string }> = [];

  async connect(_endpoint: string): Promise<void> {
    this.log.push({ action: "connect", params: { endpoint: _endpoint }, timestamp: new Date().toISOString() });
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    this.log.push({ action: "swap", params, timestamp: new Date().toISOString() });
    return {
      success: true,
      txHash: `0xSTUB_${Date.now().toString(16)}`,
      amountOut: params.amountIn * 0.997,
      fee: params.amountIn * 0.003,
    };
  }

  async getPrice(tokenIn: string, tokenOut: string): Promise<number> {
    this.log.push({ action: "getPrice", params: { tokenIn, tokenOut }, timestamp: new Date().toISOString() });
    const prices: Record<string, number> = {
      "ETH/USDC": 3248.20,
      "WBTC/USDC": 68455.00,
      "ETH/WBTC": 0.04746,
      "USDC/DAI": 1.0001,
    };
    const pair = `${tokenIn}/${tokenOut}`;
    const reversePair = `${tokenOut}/${tokenIn}`;
    if (prices[pair]) return prices[pair]!;
    if (prices[reversePair]) return 1 / prices[reversePair]!;
    return 1;
  }

  getCallLog(): typeof this.log {
    return [...this.log];
  }

  async close(): Promise<void> {
    this.log.push({ action: "close", params: {}, timestamp: new Date().toISOString() });
  }
}
