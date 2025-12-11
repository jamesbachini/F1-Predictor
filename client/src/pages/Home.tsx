import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MarketOverview } from "@/components/MarketOverview";
import { BuySharesModal } from "@/components/BuySharesModal";
import { PortfolioSection } from "@/components/PortfolioSection";
import { HowItWorks } from "@/components/HowItWorks";
import { MarketStats } from "@/components/MarketStats";
import { TeamValueChart } from "@/components/TeamValueChart";
import { DepositModal } from "@/components/DepositModal";
import { AdminPanel } from "@/components/AdminPanel";
import { useWallet } from "@/context/WalletContext";
import { useMarket } from "@/context/MarketContext";
import { AlertCircle, Trophy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { F1Team } from "@/context/MarketContext";

interface SeasonResponse {
  exists: boolean;
  status?: string;
  year?: number;
  winningTeamId?: string | null;
  prizePool?: number;
}

export default function Home() {
  const { walletAddress } = useWallet();
  const { teams } = useMarket();
  const [activeSection, setActiveSection] = useState<"market" | "portfolio">("market");
  const [selectedTeam, setSelectedTeam] = useState<F1Team | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const { data: season } = useQuery<SeasonResponse>({
    queryKey: ["/api/season"],
  });

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
    setSelectedTeam(team);
    setBuyModalOpen(true);
  };

  const handleStartTrading = () => {
    setActiveSection("market");
    const marketSection = document.getElementById("market-section");
    marketSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={setActiveSection} activeSection={activeSection} />
      
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
      
      {activeSection === "market" ? (
        <>
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
        </>
      ) : (
        <PortfolioSection />
      )}

      <BuySharesModal
        team={selectedTeam}
        open={buyModalOpen}
        onOpenChange={setBuyModalOpen}
      />

      <DepositModal
        open={connectWalletModalOpen}
        onOpenChange={setConnectWalletModalOpen}
      />

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdmin(!showAdmin)}
              data-testid="button-toggle-admin"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showAdmin ? "Hide Admin" : "Admin Panel"}
            </Button>
          </div>
          {showAdmin && <AdminPanel />}
        </div>
      </section>

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
