import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@/types/Agent";
import { Player } from "@/types/Player";
import { AgentCard } from "@/components/AgentCard";
import { AuctionStatus } from "@/components/AuctionStatus";
import { BidHistory } from "@/components/BidHistory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, User, Users, Download } from "lucide-react";
import { getAgentDecision, AgentState } from "@/utils/ddpgAgent";
import { getTeamRequirements, canTeamBidOnPlayer, updateTeamAfterPurchase } from "@/services/teamService";
import { initialTeams } from "@/types/Team";
import { SquadDisplay } from "@/components/SquadDisplay";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const teamNames = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"] as const;
const modelTeams = ["csk", "dc", "gt", "kkr", "lsg", "mi"] as const;

const initialAgents: Agent[] = Array.from({ length: 10 }, (_, i) => {
  const teamName = modelTeams[i] || "random";
  const teamData = initialTeams.find(t => t.name === teamName);
  
  return {
    id: i + 1,
    name: `${i + 1}`,
    displayName: teamNames[i],
    budget: teamData?.purse || Math.floor(Math.random() * 100000000) + 50000000,
    currentBid: null,
    strategy: i < 6 ? modelTeams[i] : "random",
    status: "waiting",
    team: teamData ? {
      name: teamData.name,
      purse: teamData.purse,
      bmen: teamData.bmen,
      arounders: teamData.arounders,
      bwlrs: teamData.bwlrs,
      overseas: teamData.overseas,
      wks: teamData.wks,
      squad: [...teamData.squad]
    } : {
      name: teamNames[i].toLowerCase(),
      purse: Math.floor(Math.random() * 100000000) + 50000000,
      bmen: 2,
      arounders: 2,
      bwlrs: 2,
      overseas: 2,
      wks: 1,
      squad: []
    }
  };
});

const Index = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<number | null>(null);
  const [bids, setBids] = useState<{ agentId: number; teamName: string; amount: number; timestamp: Date; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentBidderIndex, setCurrentBidderIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerAnalysis, setPlayerAnalysis] = useState<any>(null);
  const [waitingForPlayerDecision, setWaitingForPlayerDecision] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [playerSets, setPlayerSets] = useState<{[key: string]: string[]}>({});
  const [currentSet, setCurrentSet] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch('/auction2024list.csv').then(res => res.text()),
      fetch('/players.json').then(res => res.json())
    ]).then(([csvData, playersData]) => {
      const rows = csvData.split('\n').slice(1);
      const sets: {[key: string]: string[]} = {};
      
      rows.forEach(row => {
        const [name, setNumber] = row.split(',');
        const set = setNumber.trim();
        if (!sets[set]) sets[set] = [];
        sets[set].push(name.trim());
      });
      
      setPlayerSets(sets);
      
      const firstSetPlayers = sets['1'] || [];
      const shuffledFirstSet = [...firstSetPlayers].sort(() => Math.random() - 0.5);
      
      const matchedPlayers = shuffledFirstSet
        .map(name => playersData.find(p => p.name.toLowerCase() === name.toLowerCase()))
        .filter(p => p);
      
      setPlayers(playersData);
      setCurrentPlayer(matchedPlayers[0]);
      if (matchedPlayers[0]) {
        setCurrentBid(matchedPlayers[0].basePrice);
      }
    }).catch(error => {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load auction data",
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

  const moveToNextSet = () => {
    if (currentRound < 5) {
      const currentSetPlayers = playerSets[currentSet.toString()] || [];
      const remainingPlayers = currentSetPlayers.filter(name => 
        !agents.some(agent => 
          agent.team.squad.some(squadPlayer => 
            squadPlayer.toLowerCase() === name.toLowerCase()
          )
        )
      );

      if (remainingPlayers.length > 0) {
        const nextPlayer = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
        const playerData = players.find(p => p.name.toLowerCase() === nextPlayer.toLowerCase());
        
        if (playerData) {
          setCurrentPlayer(playerData);
          setCurrentBid(playerData.basePrice);
          setTimeRemaining(15);
          setBids([]);
          setCurrentBidder(null);
          setCurrentBidderIndex(0);
          setAgents((prev) =>
            prev.map((agent) => ({
              ...agent,
              status: agent.budget > playerData.basePrice ? "active" : "out",
            }))
          );
        }
      } else {
        const nextSet = currentSet + 1;
        setCurrentSet(nextSet);
        const nextSetPlayers = playerSets[nextSet.toString()] || [];
        
        if (nextSetPlayers.length > 0) {
          const shuffledNextSet = [...nextSetPlayers].sort(() => Math.random() - 0.5);
          const nextPlayer = players.find(p => 
            p.name.toLowerCase() === shuffledNextSet[0].toLowerCase()
          );
          
          if (nextPlayer) {
            setCurrentPlayer(nextPlayer);
            setCurrentBid(nextPlayer.basePrice);
            setTimeRemaining(15);
            setBids([]);
            setCurrentBidder(null);
            setCurrentBidderIndex(0);
            setAgents((prev) =>
              prev.map((agent) => ({
                ...agent,
                status: agent.budget > nextPlayer.basePrice ? "active" : "out",
              }))
            );
          }
        } else {
          setCurrentRound((prev) => prev + 1);
        }
      }
    }
  };

  useEffect(() => {
    if (!gameStarted || !currentPlayer) return;

    const timer = setInterval(async () => {
      if (timeRemaining > 0) {
        setTimeRemaining((prev) => prev - 1);
        
        const activeAgents = agents.filter((a) => a.status === "active");
        if (activeAgents.length > 0 && timeRemaining % 2 === 0 && !waitingForPlayerDecision) {
          const biddingAgent = activeAgents[currentBidderIndex % activeAgents.length];
          
          if (biddingAgent.id === selectedTeam) {
            setWaitingForPlayerDecision(true);
            setTimeRemaining(10);
            return;
          }

          let newBid = currentBid;
          if (biddingAgent.strategy !== "random") {
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

            try {
              const response = await fetch(`/csvs/${biddingAgent.strategy}_dataset.csv`);
              const teamData = await response.text();

              const decision = await getAgentDecision(
                agentState,
                biddingAgent.strategy,
                teamData,
                currentPlayer,
                biddingAgent.modelState
              );

              if (decision.shouldBid && canTeamBidOnPlayer(biddingAgent.team, currentPlayer.role, currentPlayer.nationality !== "India")) {
                newBid = Math.min(decision.suggestedAmount, biddingAgent.budget);
              }
            } catch (error) {
              console.error("Error loading team data:", error);
              newBid = currentBid + 2000000;
            }
          } else {
            newBid = currentBid + 2000000;
          }
          
          if (newBid <= biddingAgent.budget) {
            setCurrentBid(newBid);
            setCurrentBidder(biddingAgent.id);
            setBids((prev) => [...prev, {
              agentId: biddingAgent.id,
              teamName: biddingAgent.displayName,
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
        if (waitingForPlayerDecision) {
          setWaitingForPlayerDecision(false);
          setCurrentBidderIndex(prev => prev + 1);
          setTimeRemaining(15);
        } else if (currentBidder !== null) {
          const winningAgent = agents.find(a => a.id === currentBidder);
          if (winningAgent && currentPlayer) {
            setAgents(prev => prev.map(agent => {
              if (agent.id === currentBidder) {
                const updatedTeam = updateTeamAfterPurchase(agent.team, currentPlayer.role, currentPlayer.name, currentPlayer.nationality !== "India");
                return {
                  ...agent,
                  budget: agent.budget - currentBid,
                  team: {
                    ...agent.team,
                    ...updatedTeam,
                    squad: [...agent.team.squad, currentPlayer.name]
                  }
                };
              }
              return agent;
            }));

            toast({
              title: "Player Sold!",
              description: `${currentPlayer.name} goes to ${winningAgent.displayName} for ₹${(currentBid/100000).toFixed(1)} Lakhs`,
            });
          }
          moveToNextSet();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, currentRound, agents, currentBid, gameStarted, currentBidderIndex, selectedTeam, waitingForPlayerDecision]);

  const handlePlayerBid = () => {
    const playerAgent = agents.find(a => a.id === selectedTeam);
    if (!playerAgent || playerAgent.status !== "active" || !waitingForPlayerDecision) return;

    const newBid = currentBid + 2000000;
    if (newBid <= playerAgent.budget) {
      setCurrentBid(newBid);
      setCurrentBidder(playerAgent.id);
      setBids(prev => [...prev, {
        agentId: playerAgent.id,
        teamName: playerAgent.displayName,
        amount: newBid,
        timestamp: new Date(),
      }]);

      toast({
        title: "Your Bid!",
        description: `You bid ₹${(newBid/100000).toFixed(1)} Lakhs`,
      });
      
      setWaitingForPlayerDecision(false);
      setTimeRemaining(15);
      setCurrentBidderIndex(prev => prev + 1);
    }
  };

  const handlePassBid = () => {
    if (!waitingForPlayerDecision) return;
    
    setWaitingForPlayerDecision(false);
    setCurrentBidderIndex(prev => prev + 1);
    setTimeRemaining(15);
    
    const activeAgents = agents.filter(a => a.status === "active");
    const remainingBidders = activeAgents.length;
    
    if (remainingBidders <= 1 && currentBidder !== null) {
      const winningAgent = agents.find(a => a.id === currentBidder);
      if (winningAgent && currentPlayer) {
        setAgents(prev => prev.map(agent => {
          if (agent.id === currentBidder) {
            const updatedTeam = {
              ...agent.team,
              ...updateTeamAfterPurchase(agent.team, currentPlayer.role, currentPlayer.name, currentPlayer.nationality !== "India")
            };
            return {
              ...agent,
              budget: agent.budget - currentBid,
              team: updatedTeam
            };
          }
          return agent;
        }));

        toast({
          title: "Player Sold!",
          description: `${currentPlayer.name} goes to ${winningAgent.displayName} for ₹${(currentBid/100000).toFixed(1)} Lakhs`,
        });
        
        moveToNextSet();
      }
    }
    
    toast({
      title: "Bid Passed",
      description: "You passed on this bid",
    });
  };

  const handleExitAuction = () => {
    setShowExitDialog(true);
  };

  const downloadTeamData = () => {
    const selectedAgent = agents.find(a => a.id === selectedTeam);
    if (!selectedAgent) return;

    const teamData = {
      teamName: selectedAgent.displayName,
      remainingPurse: selectedAgent.budget,
      squad: selectedAgent.team.squad,
      timestamp: new Date().toLocaleString()
    };

    const blob = new Blob([JSON.stringify(teamData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAgent.displayName}_squad.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Team Exported!",
      description: `Your ${selectedAgent.displayName} squad has been downloaded.`,
    });
  };

  if (!gameStarted) {
    return (
      <div className="container mx-auto py-8 px-4 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center text-gradient font-serif tracking-wider">IPL Auction</h1>
          <Button 
            variant="outline" 
            onClick={handleExitAuction}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Exit Auction
          </Button>
        </div>
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center text-gradient font-serif tracking-wider">IPL Auction</h1>
        {gameStarted && (
          <Button 
            variant="outline" 
            onClick={handleExitAuction}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Exit Auction
          </Button>
        )}
      </div>
      
      {selectedTeam && (
        <SquadDisplay 
          squad={agents.find(a => a.id === selectedTeam)?.team.squad || []}
          teamName={agents.find(a => a.id === selectedTeam)?.displayName || ""}
        />
      )}
      
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
      
      {selectedTeam && waitingForPlayerDecision && (
        <div className="flex justify-center gap-4 my-4">
          <Button
            onClick={handlePlayerBid}
            disabled={agents.find(a => a.id === selectedTeam)?.status !== "active"}
            className="w-48"
          >
            Place Bid
          </Button>
          <Button
            onClick={handlePassBid}
            variant="outline"
            className="w-48"
          >
            Pass
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
