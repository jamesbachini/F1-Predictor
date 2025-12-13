import { Users, TrendingUp, Clock, Trophy, Car, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface PoolOutcome {
  id: string;
  poolId: string;
  participantId: string;
  participantName: string;
  sharesOutstanding: number;
  price: number;
  probability: number;
}

interface Pool {
  id: string;
  seasonId: string;
  type: 'team' | 'driver';
  status: string;
  bParameter: number;
  totalCollateral: number;
  outcomes: PoolOutcome[];
}

export function MarketStats() {
  const { data: teamPool } = useQuery<Pool>({
    queryKey: ["/api/pools/type/team"],
    refetchInterval: 10000,
  });

  const { data: driverPool } = useQuery<Pool>({
    queryKey: ["/api/pools/type/driver"],
    refetchInterval: 10000,
  });

  const teamCollateral = teamPool?.totalCollateral ?? 0;
  const driverCollateral = driverPool?.totalCollateral ?? 0;
  const totalCollateral = teamCollateral + driverCollateral;

  const teamOutcomes = teamPool?.outcomes ?? [];
  const driverOutcomes = driverPool?.outcomes ?? [];

  const teamTotalShares = teamOutcomes.reduce((acc, o) => acc + o.sharesOutstanding, 0);
  const driverTotalShares = driverOutcomes.reduce((acc, o) => acc + o.sharesOutstanding, 0);
  const totalShares = teamTotalShares + driverTotalShares;

  const activeTeamOutcomes = teamOutcomes.filter((o) => o.sharesOutstanding > 0).length;
  const activeDriverOutcomes = driverOutcomes.filter((o) => o.sharesOutstanding > 0).length;
  const totalActiveOutcomes = activeTeamOutcomes + activeDriverOutcomes;
  const totalOutcomes = teamOutcomes.length + driverOutcomes.length;

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
                Prize Pool
              </CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-prize-pool">
                ${totalCollateral.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                USDC backing all positions
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: ${teamCollateral.toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: ${driverCollateral.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Shares
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-total-shares">
                {totalShares.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Shares in circulation
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: {teamTotalShares.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: {driverTotalShares.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Outcomes
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-stats-active-teams">
                {totalActiveOutcomes} / {totalOutcomes}
              </div>
              <p className="text-xs text-muted-foreground">
                Outcomes with shares purchased
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> Teams: {activeTeamOutcomes}/{teamOutcomes.length}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Drivers: {activeDriverOutcomes}/{driverOutcomes.length}
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
