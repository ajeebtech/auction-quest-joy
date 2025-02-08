
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/types/Agent";
import { AgentCard } from "@/components/AgentCard";
import { AuctionStatus } from "@/components/AuctionStatus";
import { BidHistory } from "@/components/BidHistory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const teamStrategies = ["csk", "dc", "gt", "kkr", "lsg", "mi"] as const;

const initialAgents: Agent[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `${i + 1}`,
  displayName: `Team ${i + 1}`,
  budget: Math.floor(Math.random() * 1000000) + 500000,
  currentBid: null,
  strategy: i < 6 ? teamStrategies[i] : "random",
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
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentBidderIndex, setCurrentBidderIndex] = useState(0);

  const handleTeamSelect = (teamId: number) => {
    setSelectedTeam(teamId);
    setGameStarted(true);
    setAgents(prev => 
      prev.map(agent => ({
        ...agent,
        status: agent.budget > currentBid ? "active" : "out"
      }))
    );
  };

  useEffect(() => {
    if (!gameStarted) return;

    const timer = setInterval(async () => {
      if (timeRemaining > 0) {
        setTimeRemaining((prev) => prev - 1);
        
        const activeAgents = agents.filter((a) => a.status === "active");
        if (activeAgents.length > 0 && timeRemaining % 3 === 0) {
          const biddingAgent = activeAgents[currentBidderIndex % activeAgents.length];
          
          if (biddingAgent.id === selectedTeam) {
            setCurrentBidderIndex(prev => prev + 1);
            return;
          }

          // Prepare for model integration
          let newBid = currentBid;
          if (biddingAgent.strategy !== "random") {
            // TODO: Call Supabase Edge Function to get model prediction
            newBid = currentBid + Math.floor(Math.random() * 10000) + 5000; // Temporary random bid
          } else {
            newBid = currentBid + Math.floor(Math.random() * 10000) + 5000;
          }
          
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
              description: `${biddingAgent.displayName} (${biddingAgent.strategy}) bids $${newBid.toLocaleString()}`,
            });
          }
          
          setCurrentBidderIndex(prev => prev + 1);
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
  }, [timeRemaining, currentRound, agents, currentBid, gameStarted, currentBidderIndex, selectedTeam]);

  const handlePlayerBid = () => {
    const playerAgent = agents.find(a => a.id === selectedTeam);
    if (!playerAgent || playerAgent.status !== "active") return;

    const newBid = currentBid + Math.floor(Math.random() * 10000) + 5000;
    if (newBid <= playerAgent.budget) {
      setCurrentBid(newBid);
      setCurrentBidder(playerAgent.id);
      setBids(prev => [...prev, {
        agentId: playerAgent.id,
        amount: newBid,
        timestamp: new Date(),
      }]);

      toast({
        title: "Your Bid!",
        description: `You bid $${newBid.toLocaleString()}`,
      });
    }
  };

  if (!gameStarted) {
    return (
      <div className="container mx-auto py-8 px-4 min-h-screen">
        <h1 className="text-4xl font-bold text-center mb-8 text-gradient">AI Auction House</h1>
        <Card className="max-w-md mx-auto p-6 glass">
          <h2 className="text-2xl font-semibold mb-4">Select Your Team</h2>
          <div className="grid grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Button
                key={agent.id}
                onClick={() => handleTeamSelect(agent.id)}
                className="w-full h-24 text-lg font-semibold"
                variant="outline"
              >
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
  }

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
        
        {selectedTeam && (
          <div className="flex justify-center gap-4">
            <Button
              onClick={handlePlayerBid}
              disabled={agents.find(a => a.id === selectedTeam)?.status !== "active"}
              className="w-48"
            >
              Place Bid
            </Button>
          </div>
        )}
        
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
