import { createContext, useContext, useState, type ReactNode } from "react";

export interface F1Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  price: number;
  priceChange: number;
  totalShares: number;
  availableShares: number;
}

export interface Holding {
  teamId: string;
  shares: number;
  avgPrice: number;
}

interface MarketContextType {
  teams: F1Team[];
  holdings: Holding[];
  balance: number;
  prizePool: number;
  buyShares: (teamId: string, quantity: number) => boolean;
  getTeam: (teamId: string) => F1Team | undefined;
  getHolding: (teamId: string) => Holding | undefined;
  getTotalInvestment: () => number;
  getCurrentValue: () => number;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

// todo: remove mock functionality - initial F1 2026 teams data
const initialTeams: F1Team[] = [
  { id: "redbull", name: "Red Bull Racing", shortName: "RBR", color: "#1E41FF", price: 0.42, priceChange: 5.2, totalShares: 10000, availableShares: 7234 },
  { id: "ferrari", name: "Scuderia Ferrari", shortName: "FER", color: "#DC0000", price: 0.38, priceChange: 3.1, totalShares: 10000, availableShares: 6892 },
  { id: "mercedes", name: "Mercedes-AMG", shortName: "MER", color: "#00D2BE", price: 0.35, priceChange: -1.2, totalShares: 10000, availableShares: 7456 },
  { id: "mclaren", name: "McLaren F1", shortName: "MCL", color: "#FF8700", price: 0.31, priceChange: 8.4, totalShares: 10000, availableShares: 6123 },
  { id: "astonmartin", name: "Aston Martin", shortName: "AMR", color: "#006F62", price: 0.18, priceChange: -2.8, totalShares: 10000, availableShares: 8234 },
  { id: "alpine", name: "Alpine F1", shortName: "ALP", color: "#0090FF", price: 0.12, priceChange: 1.5, totalShares: 10000, availableShares: 8567 },
  { id: "williams", name: "Williams Racing", shortName: "WIL", color: "#005AFF", price: 0.08, priceChange: 4.2, totalShares: 10000, availableShares: 8912 },
  { id: "rb", name: "RB Formula One", shortName: "RB", color: "#2B4562", price: 0.07, priceChange: -0.5, totalShares: 10000, availableShares: 9123 },
  { id: "sauber", name: "Stake F1 Team", shortName: "SAU", color: "#52E252", price: 0.05, priceChange: 2.1, totalShares: 10000, availableShares: 9345 },
  { id: "haas", name: "Haas F1 Team", shortName: "HAS", color: "#FFFFFF", price: 0.04, priceChange: -1.8, totalShares: 10000, availableShares: 9456 },
];

// todo: remove mock functionality - initial holdings
const initialHoldings: Holding[] = [
  { teamId: "mclaren", shares: 50, avgPrice: 0.28 },
  { teamId: "ferrari", shares: 25, avgPrice: 0.35 },
];

export function MarketProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<F1Team[]>(initialTeams);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [balance, setBalance] = useState(100); // todo: remove mock functionality - starting balance

  const prizePool = teams.reduce((acc, team) => {
    const soldShares = team.totalShares - team.availableShares;
    return acc + soldShares * team.price;
  }, 0);

  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);
  const getHolding = (teamId: string) => holdings.find((h) => h.teamId === teamId);

  const getTotalInvestment = () => {
    return holdings.reduce((acc, h) => acc + h.shares * h.avgPrice, 0);
  };

  const getCurrentValue = () => {
    return holdings.reduce((acc, h) => {
      const team = getTeam(h.teamId);
      return acc + h.shares * (team?.price || 0);
    }, 0);
  };

  const buyShares = (teamId: string, quantity: number): boolean => {
    const team = getTeam(teamId);
    if (!team) return false;

    const cost = team.price * quantity;
    if (cost > balance || quantity > team.availableShares) return false;

    setBalance((prev) => prev - cost);
    
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, availableShares: t.availableShares - quantity, price: t.price * 1.001 }
          : t
      )
    );

    setHoldings((prev) => {
      const existing = prev.find((h) => h.teamId === teamId);
      if (existing) {
        const newShares = existing.shares + quantity;
        const newAvgPrice = (existing.shares * existing.avgPrice + quantity * team.price) / newShares;
        return prev.map((h) =>
          h.teamId === teamId ? { ...h, shares: newShares, avgPrice: newAvgPrice } : h
        );
      }
      return [...prev, { teamId, shares: quantity, avgPrice: team.price }];
    });

    return true;
  };

  return (
    <MarketContext.Provider
      value={{
        teams,
        holdings,
        balance,
        prizePool,
        buyShares,
        getTeam,
        getHolding,
        getTotalInvestment,
        getCurrentValue,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error("useMarket must be used within a MarketProvider");
  }
  return context;
}
