export interface FeeRecord {
  timestamp: string;
  type: "gas" | "swap_fee" | "protocol_fee" | "other";
  amount: number;
  description: string;
}

export class FeeManager {
  private fees: FeeRecord[] = [];

  recordFee(type: FeeRecord["type"], amount: number, description: string): void {
    this.fees.push({
      timestamp: new Date().toISOString(),
      type,
      amount,
      description,
    });
  }

  getTotalFees(): number {
    return this.fees.reduce((sum, f) => sum + f.amount, 0);
  }

  getFeesByType(): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const fee of this.fees) {
      byType[fee.type] = (byType[fee.type] ?? 0) + fee.amount;
    }
    return byType;
  }

  getRecentFees(count: number = 10): FeeRecord[] {
    return this.fees.slice(-count);
  }

  reset(): void {
    this.fees = [];
  }
}
