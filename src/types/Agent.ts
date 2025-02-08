
export interface Agent {
  id: number;
  name: string;
  budget: number;
  currentBid: number | null;
  strategy: string;
  status: "active" | "waiting" | "out";
}
