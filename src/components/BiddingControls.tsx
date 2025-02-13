
import { Button } from "@/components/ui/button";

interface BiddingControlsProps {
  onBid: () => void;
  onPass: () => void;
  isActive: boolean;
}

export const BiddingControls = ({ onBid, onPass, isActive }: BiddingControlsProps) => {
  return (
    <div className="flex justify-center gap-4 my-4">
      <Button
        onClick={onBid}
        disabled={!isActive}
        className="w-48"
      >
        Place Bid
      </Button>
      <Button
        onClick={onPass}
        variant="outline"
        className="w-48"
      >
        Pass
      </Button>
    </div>
  );
};
