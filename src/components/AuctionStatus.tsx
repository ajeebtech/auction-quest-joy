
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AuctionStatusProps {
  currentRound: number;
  totalRounds: number;
  currentBid: number;
  timeRemaining: number;
}

export const AuctionStatus = ({
  currentRound,
  totalRounds,
  currentBid,
  timeRemaining,
}: AuctionStatusProps) => {
  return (
    <Card className="p-6 glass">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Round {currentRound}/{totalRounds}</h2>
          <Progress value={(currentRound / totalRounds) * 100} className="mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Bid</p>
            <p className="text-2xl font-bold">${currentBid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time Remaining</p>
            <p className="text-2xl font-bold">{timeRemaining}s</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
