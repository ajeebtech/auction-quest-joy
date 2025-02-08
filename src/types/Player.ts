
export interface Player {
  id: number;
  name: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicket-keeper";
  basePrice: number;
  nationality: string;
  stats?: {
    matches?: number;
    runs?: number;
    wickets?: number;
    average?: number;
  };
}
