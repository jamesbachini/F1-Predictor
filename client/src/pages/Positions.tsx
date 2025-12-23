import { Header } from "@/components/Header";
import { PortfolioSection } from "@/components/PortfolioSection";

export default function Positions() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PortfolioSection />
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>F1 Predict - Predictive Market Platform</p>
          <p className="mt-1">
            This site is powered by Polymarket.com, Copyright 2025
          </p>
        </div>
      </footer>
    </div>
  );
}
