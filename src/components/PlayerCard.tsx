
import { Player } from "@/types/Player";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

interface PlayerCardProps {
  player: Player;
}

export const PlayerCard = ({ player }: PlayerCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <User className="w-12 h-12" />
        <div>
          <h2 className="text-2xl font-bold">{player.name}</h2>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{player.role}</span>
            <span>•</span>
            <span>{player.nationality}</span>
          </div>
        </div>
      </div>
      {player.stats && (
        <div className="grid grid-cols-4 gap-4 mt-2">
          <div>
            <span className="text-sm text-muted-foreground">Matches</span>
            <p className="font-semibold">{player.stats.matches}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Runs</span>
            <p className="font-semibold">{player.stats.runs}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Wickets</span>
            <p className="font-semibold">{player.stats.wickets}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Average</span>
            <p className="font-semibold">{player.stats.average}</p>
          </div>
        </div>
      )}
    </Card>
  );
};
