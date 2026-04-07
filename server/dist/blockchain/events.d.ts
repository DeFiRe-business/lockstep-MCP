export declare function listenForAgentRegistered(callback: (jobId: string, agent: string, name: string) => void): void;
export declare function listenForFundingReceived(callback: (jobId: string, investor: string, amount: bigint) => void): void;
export declare function listenForPnlReported(callback: (jobId: string, balance: bigint) => void): void;
