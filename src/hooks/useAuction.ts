
import { useState, useEffect } from "react";
import { Agent } from "@/types/Agent";
import { Player } from "@/types/Player";
import { useToast } from "@/hooks/use-toast";
import { getAgentDecision } from "@/utils/ddpgAgent";
import { canTeamBidOnPlayer, updateTeamAfterPurchase } from "@/services/teamService";

export const useAuction = (initialAgents: Agent[], players: Player[]) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<number | null>(null);
  const [bids, setBids] = useState<{ agentId: number; teamName: string; amount: number; timestamp: Date; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentBidderIndex, setCurrentBidderIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [waitingForPlayerDecision, setWaitingForPlayerDecision] = useState(false);

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
      setTimeRemaining(30);
      setCurrentBidderIndex(prev => prev + 1);
    }
  };

  const handlePassBid = () => {
    if (!waitingForPlayerDecision) return;
    
    setWaitingForPlayerDecision(false);
    setTimeRemaining(30);
    setCurrentBidderIndex(prev => prev + 1);
    
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

  useEffect(() => {
    if (!gameStarted || !currentPlayer) return;

    const timer = setInterval(async () => {
      if (timeRemaining > 0) {
        setTimeRemaining((prev) => prev - 1);
        
        const activeAgents = agents.filter((a) => a.status === "active");
        if (activeAgents.length > 0 && timeRemaining % 3 === 0 && !waitingForPlayerDecision) {
          const biddingAgent = activeAgents[currentBidderIndex % activeAgents.length];
          
          if (biddingAgent.id === selectedTeam) {
            setWaitingForPlayerDecision(true);
            setTimeRemaining(20);
            return;
          }

          let newBid = currentBid;
          if (biddingAgent.strategy !== "random") {
            const agentState = {
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
          setTimeRemaining(30);
        } else if (currentBidder !== null) {
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
          }
          moveToNextSet();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, currentRound, agents, currentBid, gameStarted, currentBidderIndex, selectedTeam, waitingForPlayerDecision]);

  return {
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
  };
};
