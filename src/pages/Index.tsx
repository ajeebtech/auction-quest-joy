
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/types/Agent";
import { AgentCard } from "@/components/AgentCard";
import { AuctionStatus } from "@/components/AuctionStatus";
import { BidHistory } from "@/components/BidHistory";

const initialAgents: Agent[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `${i + 1}`,
  budget: Math.floor(Math.random() * 1000000) + 500000,
  currentBid: null,
  strategy: ["Aggressive", "Conservative", "Balanced"][Math.floor(Math.random() * 3)],
  status: "waiting",
}));

const Index = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<number | null>(null);
  const [bids, setBids] = useState<{ agentId: number; amount: number; timestamp: Date; }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (timeRemaining > 0) {
        setTimeRemaining((prev) => prev - 1);
        
        // Simulate AI bidding
        if (Math.random() > 0.7) {
          const activeAgents = agents.filter((a) => a.status === "active");
          if (activeAgents.length > 0) {
            const biddingAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
            const newBid = currentBid + Math.floor(Math.random() * 10000) + 5000;
            
            if (newBid <= biddingAgent.budget) {
              setCurrentBid(newBid);
              setCurrentBidder(biddingAgent.id);
              setBids((prev) => [...prev, {
                agentId: biddingAgent.id,
                amount: newBid,
                timestamp: new Date(),
              }]);
              
              toast({
                title: `New Bid!`,
                description: `Agent ${biddingAgent.id} bids $${newBid.toLocaleString()}`,
              });
            }
          }
        }
      } else if (currentRound < 5) {
        setCurrentRound((prev) => prev + 1);
        setTimeRemaining(30);
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: agent.budget > currentBid ? "active" : "out",
          }))
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, currentRound, agents, currentBid]);

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gradient">AI Auction House</h1>
      
      <div className="grid gap-8">
        <AuctionStatus
          currentRound={currentRound}
          totalRounds={5}
          currentBid={currentBid}
          timeRemaining={timeRemaining}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isCurrentBidder={agent.id === currentBidder}
            />
          ))}
        </div>
        
        <BidHistory bids={bids} />
      </div>
    </div>
  );
};

export default Index;
