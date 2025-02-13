
export interface Agent {
  id: number;
  name: string;
  displayName: string;
  budget: number;
  currentBid: number | null;
  strategy: "csk" | "dc" | "gt" | "kkr" | "lsg" | "mi" | "random";
  status: "active" | "waiting" | "out";
  modelState?: {
    actor: Float32Array;
    critic: Float32Array;
    targetActor: Float32Array;
    targetCritic: Float32Array;
  };
  team: {
    name?: string;
    purse?: number;
    bmen: number;
    arounders: number;
    bwlrs: number;
    overseas: number;
    wks: number;
    squad: string[];
  };
}
