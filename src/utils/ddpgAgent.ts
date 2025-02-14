
import { Team } from "@/types/Team";

export interface AgentState {
  matches: number;
  runs: number;
  wickets: number;
  average: number;
  basePrice: number;
  currentBid: number;
  timeRemaining: number;
  role: string;
}

interface ModelState {
  actor: Float32Array;
  critic: Float32Array;
  targetActor: Float32Array;
  targetCritic: Float32Array;
}

const sigmoid = (x: number): number => {
  return 1 / (1 + Math.exp(-x));
};

export const calculateRelatabilityScore = (
  currentPlayer: any,
  targetPlayer: any,
  teamData: any
) => {
  const stats = ['matches', 'runs', 'wickets', 'average'];
  let distance = 0;
  
  for (const stat of stats) {
    if (currentPlayer.stats[stat] !== undefined && targetPlayer.stats[stat] !== undefined) {
      const diff = currentPlayer.stats[stat] - targetPlayer.stats[stat];
      distance += diff * diff;
    }
  }
  
  return Math.sqrt(distance);
};

export const calculateBudget = (
  relatability: number,
  predictedPrice: number
): number => {
  if (relatability > 2.22222222) {
    return predictedPrice + 50000000;
  }
  return predictedPrice + 10000000;
};

const loadModelWeights = async (team: string): Promise<ModelState | null> => {
  try {
    const actorResponse = await fetch(`http://localhost:5000/models/${team}/Actor_ddpg`);
    const criticResponse = await fetch(`http://localhost:5000/models/${team}/Critic_ddpg`);
    const targetActorResponse = await fetch(`http://localhost:5000/models/${team}/TargetActor_ddpg`);
    const targetCriticResponse = await fetch(`http://localhost:5000/models/${team}/TargetCritic_ddpg`);

    if (!actorResponse.ok || !criticResponse.ok || !targetActorResponse.ok || !targetCriticResponse.ok) {
      throw new Error(`Failed to load model weights for team ${team}`);
    }

    const actorData = await actorResponse.json();
    const criticData = await criticResponse.json();
    const targetActorData = await targetActorResponse.json();
    const targetCriticData = await targetCriticResponse.json();

    return {
      actor: new Float32Array(actorData.weights),
      critic: new Float32Array(criticData.weights),
      targetActor: new Float32Array(targetActorData.weights),
      targetCritic: new Float32Array(targetCriticData.weights)
    };
  } catch (error) {
    console.error("Error loading model weights:", error);
    return null;
  }
};

const predictUsingDDPG = (state: number[], weights: ModelState): number => {
  const normalizedState = state.map(s => Math.max(0, Math.min(1, s))); 
  
  const action = normalizedState.reduce((sum, val, idx) => {
    return sum + val * (weights.actor[idx] || 0);
  }, 0);
  
  return sigmoid(action);
};

function findClosestPlayer(teamData: string, currentPlayer: any) {
  const rows = teamData.split('\n');
  const headers = rows[0].split(',');
  
  let closestPlayer = null;
  let minDistance = Infinity;
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',');
    if (values.length !== headers.length) continue;
    
    const player = {
      stats: {
        matches: parseInt(values[headers.indexOf('matches')] || '0'),
        runs: parseInt(values[headers.indexOf('runs')] || '0'),
        wickets: parseInt(values[headers.indexOf('wickets')] || '0'),
        average: parseFloat(values[headers.indexOf('average')] || '0'),
      }
    };
    
    const distance = calculateRelatabilityScore(currentPlayer, player, null);
    if (distance < minDistance) {
      minDistance = distance;
      closestPlayer = player;
    }
  }
  
  return closestPlayer;
}

export const getAgentDecision = async (
  state: AgentState,
  team: string,
  teamData: any,
  currentPlayer: any,
  modelStates: ModelState | null
): Promise<{ shouldBid: boolean; suggestedAmount: number }> => {
  const normalizedState = {
    matches: state.matches / 300,
    runs: state.runs / 10000,
    wickets: state.wickets / 500,
    average: state.average / 50,
    basePrice: state.basePrice / 200000000,
    currentBid: state.currentBid / 200000000,
    timeRemaining: state.timeRemaining / 30,
    roleValue: state.role === "Bowler" ? 0 : state.role === "Batsman" ? 1 : 0.5
  };

  try {
    let weights = modelStates;
    if (!weights) {
      weights = await loadModelWeights(team.toLowerCase());
      if (!weights) {
        throw new Error("Failed to load model weights");
      }
    }

    const closestPlayer = findClosestPlayer(teamData, currentPlayer);
    const relatabilityScore = calculateRelatabilityScore(currentPlayer, closestPlayer, teamData);
    
    const stateArray = Object.values(normalizedState);
    const bidProbability = predictUsingDDPG(stateArray, weights);
    const shouldBid = bidProbability > 0.5;
    
    const predictedPrice = state.currentBid * 1.1;
    const suggestedAmount = calculateBudget(relatabilityScore, predictedPrice);

    return {
      shouldBid,
      suggestedAmount: Math.min(suggestedAmount, state.basePrice * 3)
    };
  } catch (error) {
    console.error("Error in agent decision making:", error);
    return {
      shouldBid: false,
      suggestedAmount: 0
    };
  }
};
