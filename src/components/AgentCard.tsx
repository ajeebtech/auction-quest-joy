
import { Agent } from "@/types/Agent";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Brain } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  isCurrentBidder: boolean;
}

export const AgentCard = ({ agent, isCurrentBidder }: AgentCardProps) => {
  return (
    <Card className={`p-4 glass card-hover ${isCurrentBidder ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{agent.displayName}</h3>
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
          <span>Budget: ${agent.budget.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span>Strategy: {agent.strategy}</span>
        </div>
        {agent.currentBid && (
          <div className="text-sm font-medium mt-2">
            Current Bid: ${agent.currentBid.toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
};
