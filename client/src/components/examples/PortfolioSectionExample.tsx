import { PortfolioSection } from "../PortfolioSection";
import { MarketProvider } from "@/context/MarketContext";

export default function PortfolioSectionExample() {
  return (
    <MarketProvider>
      <PortfolioSection />
    </MarketProvider>
  );
}
