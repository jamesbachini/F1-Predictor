import { MarketStats } from "../MarketStats";
import { MarketProvider } from "@/context/MarketContext";

export default function MarketStatsExample() {
  return (
    <MarketProvider>
      <MarketStats />
    </MarketProvider>
  );
}
