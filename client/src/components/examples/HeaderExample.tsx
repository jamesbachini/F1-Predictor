import { Header } from "../Header";
import { ThemeProvider } from "@/context/ThemeContext";
import { MarketProvider } from "@/context/MarketContext";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <MarketProvider>
        <Header onNavigate={(section) => console.log("Navigate to:", section)} />
      </MarketProvider>
    </ThemeProvider>
  );
}
