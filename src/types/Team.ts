
export interface Team {
  purse: number;
  bmen: number;
  arounders: number;
  bwlrs: number;
  overseas: number;
  wks: number;
  name: string;
  squad: string[];
}

export const initialTeams: Team[] = [
  {
    name: "csk",
    purse: 580000000,
    bmen: 1,
    arounders: 2,
    bwlrs: 1,
    overseas: 1,
    wks: 1,
    squad: ["Ruturaj Gaikwad", "Ravindra Jadeja", "MS Dhoni", "Shivam Dube", "Matheesha Pathirana"]
  },
  {
    name: "dc",
    purse: 762500000,
    bmen: 2,
    arounders: 1,
    bwlrs: 1,
    overseas: 1,
    wks: 1,
    squad: ["Axar Patel", "Kuldeep Yadav", "Tristan Stubbs", "Abhishek Porel"]
  },
  // ... Add all other teams similarly
];
