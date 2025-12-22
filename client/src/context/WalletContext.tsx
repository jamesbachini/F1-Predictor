import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Magic } from "magic-sdk";
import { ethers } from "ethers";

type WalletType = "magic" | "external" | null;

interface WalletContextType {
  walletAddress: string | null;
  walletType: WalletType;
  isConnecting: boolean;
  isLoading: boolean;
  userEmail: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  connectWallet: () => Promise<boolean>;
  connectWithMagic: (email: string) => Promise<boolean>;
  connectExternalWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  getUsdcBalance: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const MAGIC_API_KEY = import.meta.env.VITE_MAGIC_API_KEY || "";
const POLYGON_RPC = "https://polygon-rpc.com";
const POLYGON_CHAIN_ID = 137;
const USDC_CONTRACT_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  isPhantom?: boolean;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    phantom?: {
      ethereum?: EthereumProvider;
    };
  }
}

function getEthereumProvider(): EthereumProvider | null {
  if (window.phantom?.ethereum) {
    return window.phantom.ethereum;
  }
  if (window.ethereum) {
    return window.ethereum;
  }
  return null;
}

let magicInstance: Magic | null = null;

function getMagic(): Magic | null {
  if (!MAGIC_API_KEY) {
    console.warn("Magic API key not configured");
    return null;
  }
  if (!magicInstance) {
    magicInstance = new Magic(MAGIC_API_KEY, {
      network: {
        rpcUrl: POLYGON_RPC,
        chainId: POLYGON_CHAIN_ID,
      },
    });
  }
  return magicInstance;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const savedType = localStorage.getItem("polygon_wallet_type") as WalletType;
        const savedAddress = localStorage.getItem("polygon_wallet_address");

        if (savedType === "magic" && savedAddress) {
          const magic = getMagic();
          if (magic) {
            const isLoggedIn = await magic.user.isLoggedIn();
            if (isLoggedIn) {
              const metadata = await magic.user.getInfo();
              setWalletAddress(metadata.publicAddress || null);
              setUserEmail(metadata.email || null);
              setWalletType("magic");
              
              const magicProvider = new ethers.BrowserProvider(magic.rpcProvider as any);
              setProvider(magicProvider);
              const magicSigner = await magicProvider.getSigner();
              setSigner(magicSigner);
            } else {
              localStorage.removeItem("polygon_wallet_type");
              localStorage.removeItem("polygon_wallet_address");
            }
          }
        } else if (savedType === "external" && savedAddress) {
          const ethProvider = getEthereumProvider();
          if (ethProvider) {
            const accounts = await ethProvider.request({ method: "eth_accounts" });
            if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
              setWalletAddress(accounts[0]);
              setWalletType("external");
              
              const externalProvider = new ethers.BrowserProvider(ethProvider);
              setProvider(externalProvider);
              const externalSigner = await externalProvider.getSigner();
              setSigner(externalSigner);
            } else {
              localStorage.removeItem("polygon_wallet_type");
              localStorage.removeItem("polygon_wallet_address");
            }
          }
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    const ethProvider = getEthereumProvider();
    if (ethProvider) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (walletType === "external") {
          if (accounts.length === 0) {
            disconnectWallet();
          } else {
            setWalletAddress(accounts[0]);
            localStorage.setItem("polygon_wallet_address", accounts[0]);
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      ethProvider.on("accountsChanged", handleAccountsChanged);
      ethProvider.on("chainChanged", handleChainChanged);

      return () => {
        ethProvider.removeListener?.("accountsChanged", handleAccountsChanged);
        ethProvider.removeListener?.("chainChanged", handleChainChanged);
      };
    }
  }, [walletType]);

  const connectWithMagic = useCallback(async (email: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const magic = getMagic();
      if (!magic) {
        throw new Error("Magic not initialized - API key missing");
      }

      await magic.auth.loginWithMagicLink({ email });
      const metadata = await magic.user.getInfo();
      
      if (metadata.publicAddress) {
        setWalletAddress(metadata.publicAddress);
        setUserEmail(metadata.email || null);
        setWalletType("magic");
        localStorage.setItem("polygon_wallet_type", "magic");
        localStorage.setItem("polygon_wallet_address", metadata.publicAddress);
        
        const magicProvider = new ethers.BrowserProvider(magic.rpcProvider as any);
        setProvider(magicProvider);
        const magicSigner = await magicProvider.getSigner();
        setSigner(magicSigner);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Magic login error:", error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectExternalWallet = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    try {
      // Debug logging for provider detection
      console.log("Detecting Ethereum provider...");
      console.log("window.phantom:", typeof window.phantom, window.phantom);
      console.log("window.phantom?.ethereum:", window.phantom?.ethereum);
      console.log("window.ethereum:", window.ethereum);
      
      const ethProvider = getEthereumProvider();
      console.log("Selected provider:", ethProvider);
      console.log("Provider isPhantom:", ethProvider?.isPhantom);
      console.log("Provider isMetaMask:", ethProvider?.isMetaMask);
      
      if (!ethProvider) {
        console.error("No Ethereum provider detected");
        throw new Error("No wallet detected. Please install MetaMask, Phantom, or another Polygon-compatible wallet.");
      }

      const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
      const currentChainId = parseInt(chainIdHex, 16);

      if (currentChainId !== POLYGON_CHAIN_ID) {
        try {
          await ethProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${POLYGON_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethProvider.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${POLYGON_CHAIN_ID.toString(16)}`,
                chainName: "Polygon Mainnet",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: [POLYGON_RPC],
                blockExplorerUrls: ["https://polygonscan.com/"],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setWalletType("external");
        setUserEmail(null);
        localStorage.setItem("polygon_wallet_type", "external");
        localStorage.setItem("polygon_wallet_address", address);
        
        const externalProvider = new ethers.BrowserProvider(ethProvider);
        setProvider(externalProvider);
        const externalSigner = await externalProvider.getSigner();
        setSigner(externalSigner);
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("External wallet connection error:", error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      if (walletType === "magic") {
        const magic = getMagic();
        if (magic) {
          await magic.user.logout();
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    setWalletAddress(null);
    setWalletType(null);
    setUserEmail(null);
    setProvider(null);
    setSigner(null);
    localStorage.removeItem("polygon_wallet_type");
    localStorage.removeItem("polygon_wallet_address");
  }, [walletType]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error("No signer available. Please connect your wallet.");
    }
    return await signer.signMessage(message);
  }, [signer]);

  const getUsdcBalance = useCallback(async (): Promise<string> => {
    if (!provider || !walletAddress) {
      return "0";
    }
    try {
      const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      return "0";
    }
  }, [provider, walletAddress]);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    return await connectExternalWallet();
  }, [connectExternalWallet]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletType,
        isConnecting,
        isLoading,
        userEmail,
        provider,
        signer,
        connectWallet,
        connectWithMagic,
        connectExternalWallet,
        disconnectWallet,
        signMessage,
        getUsdcBalance,
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
