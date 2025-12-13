import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MarketOverview } from "@/components/MarketOverview";
import { PlaceOrderModal } from "@/components/PlaceOrderModal";
import { HowItWorks } from "@/components/HowItWorks";
import { MarketStats } from "@/components/MarketStats";
import { TeamValueChart } from "@/components/TeamValueChart";
import { DepositModal } from "@/components/DepositModal";
import { useWallet } from "@/context/WalletContext";
import { useMarket } from "@/context/MarketContext";
import { AlertCircle, Trophy } from "lucide-react";
import type { F1Team } from "@/context/MarketContext";

interface Market {
  id: string;
  seasonId: string;
  teamId: string;
  outstandingPairs: number;
  lockedCollateral: number;
  lastPrice: number | null;
  status: string;
}

interface USDCBalanceResponse {
  address: string;
  balance: string;
  asset: string;
}

interface SeasonResponse {
  exists: boolean;
  status?: string;
  year?: number;
  winningTeamId?: string | null;
  prizePool?: number;
}

export default function Home() {
  const { walletAddress } = useWallet();
  const { teams, userId } = useMarket();
  const [selectedTeam, setSelectedTeam] = useState<F1Team | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useState(false);

  const { data: season } = useQuery<SeasonResponse>({
    queryKey: ["/api/season"],
  });

  const { data: markets = [] } = useQuery<Market[]>({
    queryKey: ["/api/clob/markets"],
  });

  const { data: usdcBalance } = useQuery<USDCBalanceResponse>({
    queryKey: ["/api/stellar/balance", walletAddress],
    enabled: !!walletAddress,
  });

  const walletUsdcBalance = parseFloat(usdcBalance?.balance || "0");

  const getMarketForTeam = (teamId: string) => {
    return markets.find((m) => m.teamId === teamId);
  };

  const isSeasonConcluded = season?.exists && season.status === "concluded";
  const winningTeam = season?.winningTeamId 
    ? teams.find((t) => t.id === season.winningTeamId) 
    : null;

  const handleBuyTeam = (team: F1Team) => {
    if (isSeasonConcluded) {
      return;
    }
    if (!walletAddress) {
      setConnectWalletModalOpen(true);
      return;
    }
    const market = getMarketForTeam(team.id);
    if (!market) {
      return;
    }
    setSelectedTeam(team);
    setSelectedMarket(market);
    setOrderModalOpen(true);
  };

  const handleStartTrading = () => {
    const marketSection = document.getElementById("market-section");
    marketSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {isSeasonConcluded && (
        <div className="bg-amber-500/10 border-b border-amber-500/20">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <Trophy className="h-5 w-5" />
              <span className="font-medium">
                Season {season?.year} has concluded! 
                {winningTeam && ` Champion: ${winningTeam.name}.`}
                {season?.prizePool && ` Prize Pool: $${season.prizePool.toFixed(2)}`}
              </span>
              <AlertCircle className="h-4 w-4 ml-2" />
              <span className="text-sm">Trading is locked.</span>
            </div>
          </div>
        </div>
      )}
      
      <HeroSection onStartTrading={handleStartTrading} />
      <div id="market-section">
        <MarketOverview onBuyTeam={handleBuyTeam} />
      </div>
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <TeamValueChart />
        </div>
      </section>
      <HowItWorks />
      <MarketStats />

      {selectedMarket && selectedTeam && userId && (
        <PlaceOrderModal
          open={orderModalOpen}
          onClose={() => {
            setOrderModalOpen(false);
            setSelectedMarket(null);
            setSelectedTeam(null);
          }}
          market={selectedMarket}
          teamName={selectedTeam.name}
          teamColor={selectedTeam.color}
          userId={userId}
          userBalance={walletUsdcBalance}
        />
      )}

      <DepositModal
        open={connectWalletModalOpen}
        onOpenChange={setConnectWalletModalOpen}
      />

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>F1 Predict - Predictive Market Platform</p>
          <p className="mt-1">
            This is a demo application using virtual currency.
            Not affiliated with Formula 1 or FIA.
          </p>
        </div>
      </footer>
    </div>
  );
}
