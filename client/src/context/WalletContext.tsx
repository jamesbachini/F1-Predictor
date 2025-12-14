import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { StellarWalletsKit, KitEventType } from "@creit-tech/stellar-wallets-kit";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";

interface WalletContextType {
  walletAddress: string | null;
  isWalletAvailable: boolean | null;
  isFreighterInstalled: boolean | null;
  isConnecting: boolean;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<{ signedTxXdr: string }>;
  openWalletModal: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

let kitInitialized = false;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletAvailable, setIsWalletAvailable] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!kitInitialized) {
      StellarWalletsKit.init({
        modules: defaultModules(),
        network: "TESTNET" as any,
      });
      kitInitialized = true;
    }

    const checkWallets = async () => {
      try {
        const wallets = await StellarWalletsKit.refreshSupportedWallets();
        const hasAvailable = wallets.some(w => w.isAvailable);
        setIsWalletAvailable(hasAvailable);
        
        const savedAddress = localStorage.getItem("stellar_wallet_address");
        if (savedAddress) {
          setWalletAddress(savedAddress);
        }
      } catch (e) {
        console.error("Failed to check wallets:", e);
        setIsWalletAvailable(false);
      }
    };

    checkWallets();

    const unsubscribe = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
      if (event.payload.address) {
        setWalletAddress(event.payload.address);
        localStorage.setItem("stellar_wallet_address", event.payload.address);
      } else {
        setWalletAddress(null);
        localStorage.removeItem("stellar_wallet_address");
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const openWalletModal = useCallback(() => {
    const modal = document.createElement("div");
    modal.id = "stellar-wallet-modal";
    document.body.appendChild(modal);
    StellarWalletsKit.createButton(modal);
  }, []);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const wallets = await StellarWalletsKit.refreshSupportedWallets();
      const available = wallets.filter(w => w.isAvailable);
      
      if (available.length === 0) {
        return false;
      }

      StellarWalletsKit.setWallet(available[0].id);
      
      const { address } = await StellarWalletsKit.getAddress();
      if (address) {
        setWalletAddress(address);
        localStorage.setItem("stellar_wallet_address", address);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Wallet connection error:", e);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    StellarWalletsKit.disconnect();
    setWalletAddress(null);
    localStorage.removeItem("stellar_wallet_address");
  }, []);

  const signTransaction = useCallback(async (xdr: string, opts?: { networkPassphrase?: string }): Promise<{ signedTxXdr: string }> => {
    const result = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase,
      address: walletAddress || undefined,
    });
    return { signedTxXdr: result.signedTxXdr };
  }, [walletAddress]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isWalletAvailable,
        isFreighterInstalled: isWalletAvailable,
        isConnecting,
        connectWallet,
        disconnectWallet,
        signTransaction,
        openWalletModal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
