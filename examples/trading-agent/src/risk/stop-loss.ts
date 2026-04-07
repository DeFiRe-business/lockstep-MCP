export interface StopLossConfig {
  initialStopPct: number;
  trailingEnabled: boolean;
  trailingDistancePct: number;
}

export interface StopLossState {
  entryPrice: number;
  highWaterMark: number;
  stopPrice: number;
}

export function initStopLoss(entryPrice: number, config: StopLossConfig): StopLossState {
  return {
    entryPrice,
    highWaterMark: entryPrice,
    stopPrice: entryPrice * (1 - config.initialStopPct),
  };
}

export function updateStopLoss(state: StopLossState, currentPrice: number, config: StopLossConfig): StopLossState {
  if (!config.trailingEnabled) return state;

  if (currentPrice > state.highWaterMark) {
    return {
      ...state,
      highWaterMark: currentPrice,
      stopPrice: currentPrice * (1 - config.trailingDistancePct),
    };
  }
  return state;
}

export function isStopHit(state: StopLossState, currentPrice: number): boolean {
  return currentPrice <= state.stopPrice;
}
