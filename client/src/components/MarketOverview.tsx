import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TeamCard } from "./TeamCard";
import { DriverCard, type Driver } from "./DriverCard";
import { useMarket, type F1Team } from "@/context/MarketContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, User } from "lucide-react";

interface MarketOverviewProps {
  onBuyTeam?: (team: F1Team) => void;
  onBuyDriver?: (driver: Driver) => void;
}

interface SeasonResponse {
  exists: boolean;
  status?: string;
}

interface CLOBMarket {
  id: string;
  teamId: string | null;
  driverId: string | null;
  marketType: string;
  outstandingPairs: number;
  lockedCollateral: number;
  lastPrice: number | null;
  status: string;
}

interface DriverFromAPI {
  id: string;
  name: string;
  shortName: string;
  teamId: string;
  number: number;
  color: string;
}

export function MarketOverview({ onBuyTeam, onBuyDriver }: MarketOverviewProps) {
  const { teams, getHolding } = useMarket();
  const [activeTab, setActiveTab] = useState<"teams" | "drivers">("teams");

  const { data: season } = useQuery<SeasonResponse>({
    queryKey: ["/api/season"],
  });

  const { data: clobMarkets = [] } = useQuery<CLOBMarket[]>({
    queryKey: ["/api/clob/markets"],
    refetchInterval: 5000,
  });

  const { data: driversFromAPI = [] } = useQuery<DriverFromAPI[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: driverMarkets = [] } = useQuery<CLOBMarket[]>({
    queryKey: ["/api/clob/driver-markets"],
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

  // Merge CLOB driver market prices into drivers
  const driversWithPrices: Driver[] = driversFromAPI.map((driver) => {
    const market = driverMarkets.find((m) => m.driverId === driver.id);
    return {
      ...driver,
      price: market?.lastPrice ?? 0.10,
      priceChange: 0,
    };
  });

  const sortedDrivers = [...driversWithPrices].sort((a, b) => b.price - a.price);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-market-title">F1 2026 Championship</h2>
            <p className="text-muted-foreground">
              Bet on teams or drivers to win the championship
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "teams" | "drivers")} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="teams" data-testid="tab-teams" className="gap-2">
              <Car className="h-4 w-4" />
              Constructors
            </TabsTrigger>
            <TabsTrigger value="drivers" data-testid="tab-drivers" className="gap-2">
              <User className="h-4 w-4" />
              Drivers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
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
          </TabsContent>

          <TabsContent value="drivers">
            {sortedDrivers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Driver markets are not yet available.</p>
                <p className="text-sm">Check back when the admin creates driver markets.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedDrivers.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    onBuy={onBuyDriver}
                    tradingLocked={isTradingLocked}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
