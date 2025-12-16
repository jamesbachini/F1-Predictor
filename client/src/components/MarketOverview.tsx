import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TeamCard } from "./TeamCard";
import { DriverCard, type Driver } from "./DriverCard";
import { TeamValueChart } from "./TeamValueChart";
import { useMarket, type F1Team } from "@/context/MarketContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Car, User, Trophy, DollarSign } from "lucide-react";

interface MarketOverviewProps {
  onBuyTeam?: (team: F1Team) => void;
  onBuyDriver?: (driver: Driver) => void;
}

interface SeasonResponse {
  exists: boolean;
  status?: string;
}

interface PoolOutcome {
  id: string;
  poolId: string;
  participantId: string;
  participantName: string;
  sharesOutstanding: number;
  price: number;
  probability: number;
  priceChange: number;
}

interface ChampionshipPool {
  id: string;
  seasonId: string;
  type: "team" | "driver";
  status: string;
  bParameter: number;
  totalCollateral: number;
  outcomes: PoolOutcome[];
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

  // Fetch pool pricing from LMSR pools
  const { data: teamPool } = useQuery<ChampionshipPool>({
    queryKey: ["/api/pools/type/team"],
    refetchInterval: 5000,
  });

  const { data: driverPool } = useQuery<ChampionshipPool>({
    queryKey: ["/api/pools/type/driver"],
    refetchInterval: 5000,
  });

  const { data: driversFromAPI = [] } = useQuery<DriverFromAPI[]>({
    queryKey: ["/api/drivers"],
  });

  const isTradingLocked = season?.exists && season.status === "concluded";

  // Merge pool prices into teams (LMSR pricing)
  const teamsWithPoolPrices = teams.map((team) => {
    const outcome = teamPool?.outcomes?.find((o) => o.participantId === team.id);
    if (outcome) {
      return {
        ...team,
        price: outcome.price,
        priceChange: outcome.priceChange ?? 0,
      };
    }
    return team;
  });

  const sortedTeams = [...teamsWithPoolPrices].sort((a, b) => b.price - a.price);

  // Merge pool prices into drivers (LMSR pricing)
  const driversWithPrices: Driver[] = driversFromAPI.map((driver) => {
    const outcome = driverPool?.outcomes?.find((o) => o.participantId === driver.id);
    return {
      ...driver,
      price: outcome?.price ?? 0.10,
      priceChange: outcome?.priceChange ?? 0,
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
            {/* Market Summary for Constructors */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Constructors Championship</p>
                      <p className="font-semibold" data-testid="text-team-pool-name">Prize Pool</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold" data-testid="text-team-prize-pool">
                      ${teamPool?.totalCollateral?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Chart for Teams */}
            <div className="mt-8">
              <TeamValueChart type="teams" />
            </div>
          </TabsContent>

          <TabsContent value="drivers">
            {/* Market Summary for Drivers */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Drivers Championship</p>
                      <p className="font-semibold" data-testid="text-driver-pool-name">Prize Pool</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold" data-testid="text-driver-prize-pool">
                      ${driverPool?.totalCollateral?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Chart for Drivers */}
            <div className="mt-8">
              <TeamValueChart type="drivers" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
