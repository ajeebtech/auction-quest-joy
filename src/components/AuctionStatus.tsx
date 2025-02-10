
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AuctionStatusProps {
  currentRound: number;
  totalRounds: number;
  currentBid: number;
  timeRemaining: number;
  currentPlayer?: {
    name: string;
  };
}

export const AuctionStatus = ({
  currentRound,
  totalRounds,
  currentBid,
  timeRemaining,
  currentPlayer,
}: AuctionStatusProps) => {
  // 15 crore in lakhs
  const maxBid = 1500;
  const progressValue = (currentBid / 100000 / maxBid) * 100;

  return (
    <Card className="p-6 glass">
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold text-gradient text-center mb-2">
            {currentPlayer?.name || "Waiting..."}
          </h2>
          <Progress 
            value={progressValue} 
            className="mt-2" 
            indicatorClassName="transition-all"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>0 Cr</span>
            <span>15 Cr</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Bid</p>
            <p className="text-2xl font-bold">₹{(currentBid/100000).toFixed(1)} Lakhs</p>
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
