import { useQuery } from "@tanstack/react-query";
import { TeamCard } from "./TeamCard";
import { useMarket, type F1Team } from "@/context/MarketContext";

interface MarketOverviewProps {
  onBuyTeam?: (team: F1Team) => void;
}

interface SeasonResponse {
  exists: boolean;
  status?: string;
}

interface CLOBMarket {
  id: string;
  teamId: string;
  outstandingPairs: number;
  lockedCollateral: number;
  lastPrice: number | null;
  status: string;
}

export function MarketOverview({ onBuyTeam }: MarketOverviewProps) {
  const { teams, getHolding } = useMarket();

  const { data: season } = useQuery<SeasonResponse>({
    queryKey: ["/api/season"],
  });

  const { data: clobMarkets = [] } = useQuery<CLOBMarket[]>({
    queryKey: ["/api/clob/markets"],
    refetchInterval: 5000,
  });

  const isTradingLocked = season?.exists && season.status === "concluded";

  // Merge CLOB market prices into teams
  const teamsWithClobPrices = teams.map((team) => {
    const market = clobMarkets.find((m) => m.teamId === team.id);
    if (market && market.lastPrice !== null) {
      return {
        ...team,
        price: market.lastPrice,
      };
    }
    return team;
  });

  const sortedTeams = [...teamsWithClobPrices].sort((a, b) => b.price - a.price);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-market-title">F1 2026 Teams</h2>
            <p className="text-muted-foreground">
              Ranked by current share price
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {sortedTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onBuy={onBuyTeam}
              owned={getHolding(team.id)?.shares}
              tradingLocked={isTradingLocked}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
