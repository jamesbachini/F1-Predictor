import { useState } from "react";
import { BuySharesModal } from "../BuySharesModal";
import { Button } from "@/components/ui/button";
import { MarketProvider, type F1Team } from "@/context/MarketContext";
import { Toaster } from "@/components/ui/toaster";

// todo: remove mock functionality
const mockTeam: F1Team = {
  id: "ferrari",
  name: "Scuderia Ferrari",
  shortName: "FER",
  color: "#DC0000",
  price: 0.38,
  priceChange: 3.1,
  totalShares: 10000,
  availableShares: 6892,
};

function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Buy Modal</Button>
      <BuySharesModal team={mockTeam} open={open} onOpenChange={setOpen} />
      <Toaster />
    </div>
  );
}

export default function BuySharesModalExample() {
  return (
    <MarketProvider>
      <ModalDemo />
    </MarketProvider>
  );
}
