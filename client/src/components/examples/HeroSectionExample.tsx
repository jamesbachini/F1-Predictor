import { HeroSection } from "../HeroSection";
import { MarketProvider } from "@/context/MarketContext";

export default function HeroSectionExample() {
  return (
    <MarketProvider>
      <HeroSection onStartTrading={() => console.log("Start trading clicked")} />
    </MarketProvider>
  );
}
