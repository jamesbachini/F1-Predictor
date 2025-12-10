import { TeamCard } from "../TeamCard";
import type { F1Team } from "@/context/MarketContext";

// todo: remove mock functionality
const mockTeam: F1Team = {
  id: "mclaren",
  name: "McLaren F1",
  shortName: "MCL",
  color: "#FF8700",
  price: 0.31,
  priceChange: 8.4,
  totalShares: 10000,
  availableShares: 6123,
};

export default function TeamCardExample() {
  return (
    <div className="max-w-xs">
      <TeamCard
        team={mockTeam}
        onBuy={(team) => console.log("Buy shares for:", team.name)}
        owned={25}
      />
    </div>
  );
}
