import { MarketOverview } from "../MarketOverview";
import { MarketProvider } from "@/context/MarketContext";

export default function MarketOverviewExample() {
  return (
    <MarketProvider>
      <MarketOverview onBuyTeam={(team) => console.log("Buy team:", team.name)} />
    </MarketProvider>
  );
}
