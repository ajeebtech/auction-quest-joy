
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

// Implement our own sigmoid function since Math.sigmoid doesn't exist
const sigmoid = (x: number): number => {
  return 1 / (1 + Math.exp(-x));
};

export const calculateRelatabilityScore = (
  currentPlayer: any,
  targetPlayer: any,
  teamData: any
) => {
  // Calculate Euclidean distance between player stats
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
    const actorResponse = await fetch(`/models/${team}/Actor_ddpg`, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    const criticResponse = await fetch(`/models/${team}/Critic_ddpg`, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    const targetActorResponse = await fetch(`/models/${team}/TargetActor_ddpg`, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    const targetCriticResponse = await fetch(`/models/${team}/TargetCritic_ddpg`, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    if (!actorResponse.ok || !criticResponse.ok || !targetActorResponse.ok || !targetCriticResponse.ok) {
      throw new Error(`Failed to load model weights for team ${team}`);
    }

    const actorWeights = await actorResponse.arrayBuffer();
    const criticWeights = await criticResponse.arrayBuffer();
    const targetActorWeights = await targetActorResponse.arrayBuffer();
    const targetCriticWeights = await targetCriticResponse.arrayBuffer();

    return {
      actor: new Float32Array(actorWeights),
      critic: new Float32Array(criticWeights),
      targetActor: new Float32Array(targetActorWeights),
      targetCritic: new Float32Array(targetCriticWeights)
    };
  } catch (error) {
    console.error("Error loading model weights:", error);
    return null;
  }
};

const predictUsingDDPG = (state: number[], weights: ModelState): number => {
  const normalizedState = state.map(s => Math.max(0, Math.min(1, s))); // ReLU-like activation
  
  // Simple weighted sum as a placeholder for the actual neural network computation
  const action = normalizedState.reduce((sum, val, idx) => {
    return sum + val * (weights.actor[idx] || 0);
  }, 0);
  
  return sigmoid(action); // Use our custom sigmoid function
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
  // Normalize state values
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
    // Load model weights if not already loaded
    let weights = modelStates;
    if (!weights) {
      weights = await loadModelWeights(team.toLowerCase());
      if (!weights) {
        throw new Error("Failed to load model weights");
      }
    }

    // Find closest player in team's dataset for comparison
    const closestPlayer = findClosestPlayer(teamData, currentPlayer);
    const relatabilityScore = calculateRelatabilityScore(currentPlayer, closestPlayer, teamData);
    
    // Convert normalized state to array for DDPG input
    const stateArray = Object.values(normalizedState);
    
    // Get bidding decision from DDPG model
    const bidProbability = predictUsingDDPG(stateArray, weights);
    const shouldBid = bidProbability > 0.5;
    
    // Calculate suggested bid amount based on relatability and current price
    const predictedPrice = state.currentBid * 1.1; // Simple price prediction
    const suggestedAmount = calculateBudget(relatabilityScore, predictedPrice);

    return {
      shouldBid,
      suggestedAmount: Math.min(suggestedAmount, state.basePrice * 3) // Cap at 3x base price
    };
  } catch (error) {
    console.error("Error in agent decision making:", error);
    return {
      shouldBid: false,
      suggestedAmount: 0
    };
  }
};
