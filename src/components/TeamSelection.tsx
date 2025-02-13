
import { Agent } from "@/types/Agent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface TeamSelectionProps {
  agents: Agent[];
  onTeamSelect: (teamId: number) => void;
}

export const TeamSelection = ({ agents, onTeamSelect }: TeamSelectionProps) => {
  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gradient font-serif tracking-wider">IPL Auction</h1>
      <Card className="max-w-md mx-auto p-6 glass">
        <h2 className="text-2xl font-semibold mb-4">Select Your Team</h2>
        <div className="grid grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              onClick={() => onTeamSelect(agent.id)}
              className="w-full h-24 text-lg font-semibold relative"
              variant="outline"
            >
              <Shield className="absolute top-2 right-2 w-4 h-4 opacity-50" />
              {agent.displayName}
              <span className="text-sm text-muted-foreground block">
                {agent.strategy}
              </span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
