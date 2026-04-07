export interface ExposureCheck {
  totalCapital: number;
  currentExposure: number;
  maxTotalExposure: number;
  maxSinglePosition: number;
}

export function canOpenPosition(check: ExposureCheck, positionSize: number): {
  allowed: boolean;
  reason: string;
} {
  const newExposure = check.currentExposure + positionSize;
  const exposureRatio = newExposure / check.totalCapital;

  if (exposureRatio > check.maxTotalExposure) {
    return {
      allowed: false,
      reason: `Total exposure ${(exposureRatio * 100).toFixed(1)}% would exceed max ${(check.maxTotalExposure * 100).toFixed(1)}%`,
    };
  }

  const positionRatio = positionSize / check.totalCapital;
  if (positionRatio > check.maxSinglePosition) {
    return {
      allowed: false,
      reason: `Position size ${(positionRatio * 100).toFixed(1)}% exceeds max single position ${(check.maxSinglePosition * 100).toFixed(1)}%`,
    };
  }

  return { allowed: true, reason: "ok" };
}

export function getCurrentExposureRatio(totalCapital: number, currentExposure: number): number {
  if (totalCapital === 0) return 0;
  return currentExposure / totalCapital;
}
