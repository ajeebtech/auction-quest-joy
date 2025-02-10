
export interface Player {
  id: number;
  name: string;
  role: string;
  basePrice: number;
  nationality: string;
  stats: {
    matches: number;
    runs: number;
    wickets: number;
    average: number;
  };
}

