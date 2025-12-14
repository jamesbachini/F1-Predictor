import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, Loader2, Clock, CheckCircle, Car, User, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMarket } from "@/context/MarketContext";
import { useWallet } from "@/context/WalletContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface USDCBalanceResponse {
  address: string;
  balance: string;
  asset: string;
}

interface PoolPosition {
  id: string;
  poolId: string;
  outcomeId: string;
  userId: string;
  sharesOwned: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  potentialPayout: number;
  poolType: 'team' | 'driver';
  poolStatus: string;
  participantName: string;
  participantId: string;
}

interface PoolTrade {
  id: string;
  poolId: string;
  outcomeId: string;
  userId: string;
  sharesAmount: number;
  collateralCost: number;
  priceAtTrade: number;
  createdAt: string;
}

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

export function PortfolioSection() {
  const { teams, userId } = useMarket();
  const { walletAddress } = useWallet();
  const { toast } = useToast();

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PoolPosition | null>(null);
  const [sellShares, setSellShares] = useState(1);
  const [isSelling, setIsSelling] = useState(false);

  const { data: usdcBalance, isLoading: isLoadingBalance } = useQuery<USDCBalanceResponse>({
    queryKey: ["/api/stellar/balance", walletAddress],
    enabled: !!walletAddress,
  });

  const { data: positions = [], isLoading: isLoadingPositions } = useQuery<PoolPosition[]>({
    queryKey: ["/api/pools/positions", userId],
    enabled: !!userId,
  });

  const { data: trades = [], isLoading: isLoadingTrades } = useQuery<PoolTrade[]>({
    queryKey: ["/api/pools/trades", userId],
    enabled: !!userId,
  });

  const { data: teamPool } = useQuery<Pool>({
    queryKey: ["/api/pools/type/team"],
  });

  const { data: driverPool } = useQuery<Pool>({
    queryKey: ["/api/pools/type/driver"],
  });

  const cashBalance = parseFloat(usdcBalance?.balance || "0");

  const getOutcomeName = (position: PoolPosition): string => {
    return position.participantName || "Unknown";
  };

  const getOutcomeColor = (position: PoolPosition): string => {
    if (position.poolType === 'team') {
      const team = teams.find(t => t.id === position.participantId);
      return team?.color || "#666";
    }
    return "#888";
  };

  const teamPositions = positions.filter(p => p.poolType === 'team');
  const driverPositions = positions.filter(p => p.poolType === 'driver');

  const totalPositionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPositive = totalPnl >= 0;

  const totalPortfolioValue = totalPositionsValue + cashBalance;

  const sortedPositions = [...positions].sort((a, b) => b.currentValue - a.currentValue);

  const openSellModal = (position: PoolPosition) => {
    setSelectedPosition(position);
    setSellShares(Math.min(10, Math.floor(position.sharesOwned)));
    setSellModalOpen(true);
  };

  const closeSellModal = () => {
    setSellModalOpen(false);
    setSelectedPosition(null);
    setSellShares(1);
  };

  const handleSell = async () => {
    if (!selectedPosition || sellShares <= 0) return;

    setIsSelling(true);
    try {
      const response = await fetch(`/api/pools/${selectedPosition.poolId}/demo-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId: selectedPosition.outcomeId,
          userId,
          shares: sellShares,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to sell shares");
      }

      toast({
        title: "Shares Sold",
        description: `Sold ${sellShares} shares for $${result.proceeds.toFixed(2)} demo credits`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/pools/positions", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pools/trades", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pools/type/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pools/type/driver"] });

      closeSellModal();
    } catch (error: any) {
      toast({
        title: "Sell Failed",
        description: error.message || "Failed to sell shares",
        variant: "destructive",
      });
    } finally {
      setIsSelling(false);
    }
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-bold" data-testid="text-portfolio-title">Your Positions</h2>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" data-testid="text-total-value">
                ${totalPortfolioValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Positions Value
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" data-testid="text-holdings-value">
                ${totalPositionsValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1">
                  <Car className="h-3 w-3" /> {teamPositions.length}
                </span>
                <span className="mx-2">|</span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" /> {driverPositions.length}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                USDC Balance
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : walletAddress ? (
                <div className="text-2xl font-bold tabular-nums" data-testid="text-cash-balance">
                  ${cashBalance.toFixed(2)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Connect wallet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unrealized P&L
              </CardTitle>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  isPositive ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"
                }`}
                data-testid="text-pnl"
              >
                {isPositive ? "+" : ""}${totalPnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Positions Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPositions ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedPositions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                You don't have any positions yet. Start trading to build your portfolio!
              </p>
            ) : (
              <div className="space-y-4">
                {sortedPositions.map((position) => {
                  const percentOfPortfolio = totalPositionsValue > 0 ? (position.currentValue / totalPositionsValue) * 100 : 0;
                  const isPositionPositive = position.pnl >= 0;
                  const outcomeName = getOutcomeName(position);
                  const color = getOutcomeColor(position);

                  return (
                    <div key={position.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium" data-testid={`text-position-name-${position.id}`}>
                                {outcomeName}
                              </p>
                              <Badge variant={position.poolType === 'team' ? "default" : "secondary"}>
                                {position.poolType === 'team' ? 'Team' : 'Driver'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {position.sharesOwned.toFixed(2)} shares @ ${(position.totalCost / position.sharesOwned).toFixed(4)} avg
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Current: ${position.currentPrice.toFixed(4)} | If wins: ${position.potentialPayout.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold tabular-nums" data-testid={`text-position-value-${position.id}`}>
                              ${position.currentValue.toFixed(2)}
                            </p>
                            <p
                              className={`text-sm tabular-nums ${
                                isPositionPositive
                                  ? "text-green-500 dark:text-green-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {isPositionPositive ? "+" : ""}${position.pnl.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSellModal(position)}
                            data-testid={`button-sell-${position.id}`}
                          >
                            Sell
                          </Button>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${Math.min(100, percentOfPortfolio)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrades ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : trades.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No trades yet.
              </p>
            ) : (
              <div className="space-y-3">
                {trades.slice(0, 20).map((trade) => {
                  const pool = teamPool?.id === trade.poolId ? teamPool : driverPool;
                  const outcome = pool?.outcomes?.find(o => o.id === trade.outcomeId);
                  const team = teams.find(t => t.id === outcome?.participantId);

                  return (
                    <div 
                      key={trade.id} 
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 flex-wrap"
                      data-testid={`trade-row-${trade.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {team && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            BUY {trade.sharesAmount.toFixed(2)} shares @ ${trade.priceAtTrade.toFixed(4)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {outcome?.participantName || "Unknown"} - Cost: ${trade.collateralCost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-4 w-4" />
                        completed
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={sellModalOpen} onOpenChange={(open) => !open && closeSellModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-sell-modal-title">
              Sell {selectedPosition?.participantName}
            </DialogTitle>
            <DialogDescription>
              Sell shares to receive demo credits back
            </DialogDescription>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="text-muted-foreground text-sm">Current Price</span>
                  <div className="text-xl font-bold tabular-nums">
                    ${selectedPosition.currentPrice.toFixed(4)}/share
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-sm">You Own</span>
                  <div className="text-xl font-bold tabular-nums">
                    {selectedPosition.sharesOwned.toFixed(2)} shares
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Shares to Sell</label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setSellShares(Math.max(1, sellShares - 1))}
                    disabled={sellShares <= 1}
                    data-testid="button-decrease-sell-shares"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-20 text-center text-2xl font-bold tabular-nums" data-testid="text-sell-shares">
                    {sellShares}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setSellShares(Math.min(Math.floor(selectedPosition.sharesOwned), sellShares + 1))}
                    disabled={sellShares >= Math.floor(selectedPosition.sharesOwned)}
                    data-testid="button-increase-sell-shares"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSellShares(Math.floor(selectedPosition.sharesOwned))}
                    data-testid="button-sell-all"
                  >
                    Sell All
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated Proceeds</span>
                  <span className="text-2xl font-bold tabular-nums text-green-600" data-testid="text-sell-proceeds">
                    ${(sellShares * selectedPosition.currentPrice).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be added to your demo credits balance
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={closeSellModal} data-testid="button-cancel-sell">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSell}
              disabled={isSelling || sellShares <= 0}
              data-testid="button-confirm-sell"
            >
              {isSelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Selling...
                </>
              ) : (
                `Sell ${sellShares} Shares`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
