
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";

interface SquadDisplayProps {
  squad: string[];
  teamName: string;
}

export const SquadDisplay = ({ squad, teamName }: SquadDisplayProps) => {
  return (
    <Card className="fixed top-4 right-4 w-64 glass">
      <div className="p-4 border-b flex items-center gap-2">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold">{teamName} Squad</h3>
      </div>
      <ScrollArea className="h-[300px] p-4">
        <div className="space-y-2">
          {squad?.length > 0 ? (
            squad.map((player, index) => (
              <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                {player}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No players in squad</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
