
import { Team } from "@/types/Team";
import { initialTeams } from "@/types/Team";

export const getTeamRequirements = (teamName: string): Team | undefined => {
  return initialTeams.find(team => team.name === teamName);
};

export const canTeamBidOnPlayer = (
  team: Partial<Team>,
  playerRole: string,
  isOverseas: boolean
): boolean => {
  if (!team) return false;
  
  // Check if team can bid based on their requirements
  switch (playerRole) {
    case "Batsman":
      if (team.bmen <= 0) return false;
      break;
    case "AllRounder":
      if (team.arounders <= 0) return false;
      break;
    case "Bowler":
      if (team.bwlrs <= 0) return false;
      break;
  }

  if (isOverseas && team.overseas <= 0) return false;
  
  return true;
};

export const updateTeamAfterPurchase = (
  team: Partial<Team>,
  playerRole: string,
  playerName: string,
  isOverseas: boolean
): Partial<Team> => {
  if (!team) return team;
  
  const updatedTeam = { 
    ...team,
    squad: team.squad ? [...team.squad] : []
  };
  
  // Update roster spots
  switch (playerRole) {
    case "Batsman":
      if (updatedTeam.bmen) updatedTeam.bmen--;
      break;
    case "AllRounder":
      if (updatedTeam.arounders) updatedTeam.arounders--;
      break;
    case "Bowler":
      if (updatedTeam.bwlrs) updatedTeam.bwlrs--;
      break;
  }

  if (isOverseas && updatedTeam.overseas) {
    updatedTeam.overseas--;
  }

  updatedTeam.squad.push(playerName);
  
  return updatedTeam;
};
