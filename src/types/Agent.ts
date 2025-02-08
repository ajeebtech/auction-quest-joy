
export interface Agent {
  id: number;
  name: string;
  displayName: string;
  budget: number;
  currentBid: number | null;
  strategy: "csk" | "dc" | "gt" | "kkr" | "lsg" | "mi" | "random";
  status: "active" | "waiting" | "out";
  modelState?: {
    actor_state: any;
    critic_state: any;
    target_actor_state: any;
    target_critic_state: any;
  };
}
