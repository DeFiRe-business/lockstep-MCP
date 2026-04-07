export interface PnlSnapshot {
  timestamp: string;
  balance: number;
  pnl: number;
  pnlPct: number;
  openPositions: number;
}

export class ProfitTracker {
  private initialCapital: number;
  private snapshots: PnlSnapshot[] = [];

  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
  }

  recordSnapshot(currentBalance: number, openPositions: number): PnlSnapshot {
    const pnl = currentBalance - this.initialCapital;
    const pnlPct = (pnl / this.initialCapital) * 100;
    const snapshot: PnlSnapshot = {
      timestamp: new Date().toISOString(),
      balance: currentBalance,
      pnl,
      pnlPct: Math.round(pnlPct * 100) / 100,
      openPositions,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getCurrentPnl(currentBalance: number): { pnl: number; pnlPct: number } {
    const pnl = currentBalance - this.initialCapital;
    return { pnl, pnlPct: (pnl / this.initialCapital) * 100 };
  }

  getMaxDrawdown(): number {
    if (this.snapshots.length === 0) return 0;
    let peak = this.snapshots[0]!.balance;
    let maxDrawdown = 0;
    for (const snap of this.snapshots) {
      if (snap.balance > peak) peak = snap.balance;
      const drawdown = (peak - snap.balance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
  }

  getSnapshots(): PnlSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): PnlSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }
}
