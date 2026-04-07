export interface SizingParams {
  capitalAvailable: number;
  maxPositionSize: number;
  winRate: number;
  avgWinLossRatio: number;
}

export function kellySize(params: SizingParams): number {
  const { capitalAvailable, maxPositionSize, winRate, avgWinLossRatio } = params;

  const kellyFraction = winRate - (1 - winRate) / avgWinLossRatio;
  const clampedKelly = Math.max(0, Math.min(kellyFraction, 0.25));
  const rawSize = capitalAvailable * clampedKelly;

  return Math.min(rawSize, capitalAvailable * maxPositionSize);
}

export function fixedFractionSize(capitalAvailable: number, fractionPct: number): number {
  return capitalAvailable * (fractionPct / 100);
}
