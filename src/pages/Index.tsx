import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/types/Agent";
import { Player } from "@/types/Player";
import { AgentCard } from "@/components/AgentCard";
import { AuctionStatus } from "@/components/AuctionStatus";
import { BidHistory } from "@/components/BidHistory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, User } from "lucide-react";
import { getAgentDecision, AgentState } from "@/utils/ddpgAgent";

const teamNames = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"] as const;
const modelTeams = ["csk", "dc", "gt", "kkr", "lsg", "mi"] as const;

const initialAgents: Agent[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `${i + 1}`,
  displayName: teamNames[i],
  budget: Math.floor(Math.random() * 100000000) + 50000000,
  currentBid: null,
  strategy: i < 6 ? modelTeams[i] : "random",
  status: "waiting",
}));

const Index = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<number | null>(null);
  const [bids, setBids] = useState<{ agentId: number; amount: number; timestamp: Date; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentBidderIndex, setCurrentBidderIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerAnalysis, setPlayerAnalysis] = useState<any>(null); // Placeholder for player analysis

  useEffect(() => {
    fetch('/players.json')  // Updated path to fetch from public directory
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setCurrentPlayer(data[0]);
        setCurrentBid(data[0].basePrice);
      })
      .catch(error => {
        console.error('Error loading players:', error);
        toast({
          title: "Error",
          description: "Failed to load player data",
          variant: "destructive",
        });
      });
  }, []);

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
    if (!gameStarted || !currentPlayer) return;

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

          let newBid = currentBid;
          if (biddingAgent.strategy !== "random") {
            // Use DDPG agent for decision making
            const agentState: AgentState = {
              matches: currentPlayer.stats.matches,
              runs: currentPlayer.stats.runs,
              wickets: currentPlayer.stats.wickets,
              average: currentPlayer.stats.average,
              basePrice: currentPlayer.basePrice,
              currentBid: currentBid,
              timeRemaining: timeRemaining,
              role: currentPlayer.role
            };

            const shouldBid = getAgentDecision(
              agentState,
              biddingAgent.strategy,
              biddingAgent.modelState // This would contain the loaded model weights
            );

            if (shouldBid) {
              // Calculate bid increment based on agent's analysis
              const maxBid = playerAnalysis ? playerAnalysis.recommendedMaxBid : currentBid + 2000000;
              const bidIncrement = Math.min(2000000, maxBid - currentBid);
              newBid = currentBid + bidIncrement;
            }
          } else {
            newBid = currentBid + 2000000; // Default increment for random strategy
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
              description: `${biddingAgent.displayName} bids ₹${(newBid/100000).toFixed(1)} Lakhs`,
            });
          }
          
          setCurrentBidderIndex(prev => prev + 1);
        }
      } else {
        moveToNextSet();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, currentRound, agents, currentBid, gameStarted, currentBidderIndex, selectedTeam, playerAnalysis]);

  const moveToNextSet = () => {
    if (currentRound < 5) {
      const nextPlayerIndex = currentPlayerIndex + 1;
      if (nextPlayerIndex < players.length) {
        setCurrentPlayerIndex(nextPlayerIndex);
        setCurrentPlayer(players[nextPlayerIndex]);
        setCurrentBid(players[nextPlayerIndex].basePrice);
        setTimeRemaining(30);
        setBids([]);
        setCurrentBidder(null);
        setCurrentBidderIndex(0);
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: agent.budget > players[nextPlayerIndex].basePrice ? "active" : "out",
          }))
        );
      } else {
        setCurrentRound((prev) => prev + 1);
        setTimeRemaining(30);
      }
    }
  };

  const handlePlayerBid = () => {
    const playerAgent = agents.find(a => a.id === selectedTeam);
    if (!playerAgent || playerAgent.status !== "active") return;

    const newBid = currentBid + 2000000; // 20 lakh increment
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
        description: `You bid ₹${(newBid/100000).toFixed(1)} Lakhs`,
      });
    }
  };

  if (!gameStarted) {
    return (
      <div className="container mx-auto py-8 px-4 min-h-screen">
        <h1 className="text-4xl font-bold text-center mb-8 text-gradient font-serif tracking-wider">IPL Auction</h1>
        <Card className="max-w-md mx-auto p-6 glass">
          <h2 className="text-2xl font-semibold mb-4">Select Your Team</h2>
          <div className="grid grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Button
                key={agent.id}
                onClick={() => handleTeamSelect(agent.id)}
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
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gradient font-serif tracking-wider">IPL Auction</h1>
      
      {currentPlayer && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <User className="w-12 h-12" />
            <div>
              <h2 className="text-2xl font-bold">{currentPlayer.name}</h2>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>{currentPlayer.role}</span>
                <span>•</span>
                <span>{currentPlayer.nationality}</span>
              </div>
            </div>
          </div>
          {currentPlayer.stats && (
            <div className="grid grid-cols-4 gap-4 mt-2">
              <div>
                <span className="text-sm text-muted-foreground">Matches</span>
                <p className="font-semibold">{currentPlayer.stats.matches}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Runs</span>
                <p className="font-semibold">{currentPlayer.stats.runs}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Wickets</span>
                <p className="font-semibold">{currentPlayer.stats.wickets}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Average</span>
                <p className="font-semibold">{currentPlayer.stats.average}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      <AuctionStatus
        currentRound={currentRound}
        totalRounds={5}
        currentBid={currentBid}
        timeRemaining={timeRemaining}
        currentPlayer={currentPlayer}
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
  );
};

export default Index;
