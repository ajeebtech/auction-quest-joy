
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Bid {
  agentId: number;
  teamName: string;
  amount: number;
  timestamp: Date;
}

interface BidHistoryProps {
  bids: Bid[];
}

export const BidHistory = ({ bids }: BidHistoryProps) => {
  return (
    <Card className="glass h-[300px]">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Bid History</h3>
      </div>
      <ScrollArea className="h-[240px] p-4">
        <div className="space-y-2">
          {bids.map((bid, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-sm animate-fade-in"
            >
              <span>{bid.teamName}</span>
              <span>₹{(bid.amount/100000).toFixed(1)} Lakhs</span>
              <span className="text-muted-foreground">
                {bid.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
