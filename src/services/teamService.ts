
import { Team } from "@/types/Team";
import { initialTeams } from "@/types/Team";

export const getTeamRequirements = (teamName: string): Team | undefined => {
  return initialTeams.find(team => team.name === teamName);
};

export const canTeamBidOnPlayer = (
  team: Team,
  playerRole: string,
  isOverseas: boolean
): boolean => {
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
  team: Team,
  playerRole: string,
  playerName: string,
  isOverseas: boolean
): Team => {
  const updatedTeam = { ...team };
  
  // Update roster spots
  switch (playerRole) {
    case "Batsman":
      updatedTeam.bmen--;
      break;
    case "AllRounder":
      updatedTeam.arounders--;
      break;
    case "Bowler":
      updatedTeam.bwlrs--;
      break;
  }

  if (isOverseas) {
    updatedTeam.overseas--;
  }

  updatedTeam.squad.push(playerName);
  
  return updatedTeam;
};
