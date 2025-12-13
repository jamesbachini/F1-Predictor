import { Users, TrendingUp, Clock, Trophy, Car, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarket } from "@/context/MarketContext";
import { useQuery } from "@tanstack/react-query";

interface Market {
  id: string;
  teamId?: string | null;
  driverId?: string | null;
  marketType?: string;
  outstandingPairs: number;
  lockedCollateral: number;
  lastPrice: number | null;
  status: string;
}

export function MarketStats() {
  const { teams } = useMarket();

  const { data: allMarkets = [] } = useQuery<Market[]>({
    queryKey: ["/api/clob/markets"],
    refetchInterval: 10000,
  });

  const teamMarkets = allMarkets.filter((m) => m.teamId && !m.driverId);
  const driverMarkets = allMarkets.filter((m) => m.driverId && !m.teamId);

  const teamOutstandingPairs = teamMarkets.reduce((acc, m) => acc + m.outstandingPairs, 0);
  const driverOutstandingPairs = driverMarkets.reduce((acc, m) => acc + m.outstandingPairs, 0);
  const totalOutstandingPairs = teamOutstandingPairs + driverOutstandingPairs;

  const teamLockedCollateral = teamMarkets.reduce((acc, m) => acc + m.lockedCollateral, 0);
  const driverLockedCollateral = driverMarkets.reduce((acc, m) => acc + m.lockedCollateral, 0);
  const totalLockedCollateral = teamLockedCollateral + driverLockedCollateral;

  const activeTeamMarkets = teamMarkets.filter((m) => m.outstandingPairs > 0).length;
  const activeDriverMarkets = driverMarkets.filter((m) => m.outstandingPairs > 0).length;
  const totalActiveMarkets = activeTeamMarkets + activeDriverMarkets;
  const totalMarkets = teamMarkets.length + driverMarkets.length;

  const seasonStart = new Date("2026-03-15");
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((seasonStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-bold" data-testid="text-stats-title">Market Statistics</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collateral Locked
              </CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-prize-pool">
                ${totalLockedCollateral.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                USDC backing all positions
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: ${teamLockedCollateral.toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: ${driverLockedCollateral.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Pairs
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-total-shares">
                {totalOutstandingPairs.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                YES/NO share pairs in circulation
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: {teamOutstandingPairs.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: {driverOutstandingPairs.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Markets
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-active-teams">
                {totalActiveMarkets} / {totalMarkets}
              </div>
              <p className="text-xs text-muted-foreground">
                Markets with trading activity
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: {activeTeamMarkets}/{teams.length}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: {activeDriverMarkets}/{driverMarkets.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Season Starts
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-days-until">
                {daysUntil} days
              </div>
              <p className="text-xs text-muted-foreground">
                Until 2026 F1 Championship begins
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
