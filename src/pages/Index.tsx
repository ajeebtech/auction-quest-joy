
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Player } from "@/types/Player";
import { initialTeams } from "@/types/Team";
import { TeamSelection } from "@/components/TeamSelection";
import { PlayerCard } from "@/components/PlayerCard";
import { BiddingControls } from "@/components/BiddingControls";
import { AgentCard } from "@/components/AgentCard";
import { AuctionStatus } from "@/components/AuctionStatus";
import { BidHistory } from "@/components/BidHistory";
import { SquadDisplay } from "@/components/SquadDisplay";
import { useAuction } from "@/hooks/useAuction";

const teamNames = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"] as const;
const modelTeams = ["csk", "dc", "gt", "kkr", "lsg", "mi"] as const;

const initialAgents = Array.from({ length: 10 }, (_, i) => {
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
  const [players, setPlayers] = useState<Player[]>([]);
  
  useEffect(() => {
    fetch('/players.json')
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
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

  const {
    agents,
    currentRound,
    timeRemaining,
    currentPlayer,
    currentBid,
    currentBidder,
    bids,
    selectedTeam,
    gameStarted,
    waitingForPlayerDecision,
    handleTeamSelect,
    handlePlayerBid,
    handlePassBid,
  } = useAuction(initialAgents, players);

  if (!gameStarted) {
    return <TeamSelection agents={agents} onTeamSelect={handleTeamSelect} />;
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gradient font-serif tracking-wider">IPL Auction</h1>
      
      {selectedTeam && (
        <SquadDisplay 
          squad={agents.find(a => a.id === selectedTeam)?.team.squad || []}
          teamName={agents.find(a => a.id === selectedTeam)?.displayName || ""}
        />
      )}
      
      {currentPlayer && <PlayerCard player={currentPlayer} />}

      <AuctionStatus
        currentRound={currentRound}
        totalRounds={5}
        currentBid={currentBid}
        timeRemaining={timeRemaining}
        currentPlayer={currentPlayer}
      />
      
      {selectedTeam && waitingForPlayerDecision && (
        <BiddingControls
          onBid={handlePlayerBid}
          onPass={handlePassBid}
          isActive={agents.find(a => a.id === selectedTeam)?.status === "active"}
        />
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
