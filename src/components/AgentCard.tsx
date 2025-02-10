
import { Agent } from "@/types/Agent";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Brain, Shield } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  isCurrentBidder: boolean;
}

export const AgentCard = ({ agent, isCurrentBidder }: AgentCardProps) => {
  return (
    <Card className={`p-4 glass card-hover ${isCurrentBidder ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 opacity-70" />
          <h3 className="font-semibold text-lg">{agent.displayName}</h3>
        </div>
        <Badge
          variant={agent.status === "active" ? "default" : "secondary"}
          className="animate-fade-in"
        >
          {agent.status}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="w-4 h-4" />
          <span>Budget: ₹{(agent.budget/100000).toFixed(1)} Lakhs</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span>Strategy: {agent.strategy}</span>
        </div>
        {agent.currentBid && (
          <div className="text-sm font-medium mt-2">
            Current Bid: ₹{(agent.currentBid/100000).toFixed(1)} Lakhs
          </div>
        )}
      </div>
    </Card>
  );
};
