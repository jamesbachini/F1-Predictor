import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/context/WalletContext";
import { 
  checkDepositRequirements, 
  approveUSDCForExchange,
  approveUSDCForNegRiskExchange,
  approveCTFForExchange,
  approveCTFForNegRiskExchange,
  POLYMARKET_CONTRACTS,
} from "@/lib/polymarketDeposit";
import { ethers } from "ethers";
import { Check, Loader2, AlertCircle, ExternalLink, ArrowRight, Wallet, Shield, ChevronRight } from "lucide-react";

interface PolymarketDepositWizardProps {
  open: boolean;
  onClose: () => void;
}

type Step = "check" | "approve_usdc" | "approve_ctf" | "complete" | "error";

interface DepositStatus {
  usdcBalance: string;
  ctfExchangeAllowance: string;
  negRiskExchangeAllowance: string;
  ctfApprovedForExchange: boolean;
  ctfApprovedForNegRisk: boolean;
  proxyAddress: string | null;
  proxyBalance: string | null;
  needsApproval: boolean;
  needsCTFApproval: boolean;
}

export function PolymarketDepositWizard({ open, onClose }: PolymarketDepositWizardProps) {
  const { walletAddress, walletType, signer, provider } = useWallet();
  const [step, setStep] = useState<Step>("check");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (open && walletAddress) {
      checkStatus();
    }
  }, [open, walletAddress]);

  const checkStatus = async () => {
    if (!walletAddress || !provider) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const isMagic = walletType === "magic";
      
      const status = await checkDepositRequirements(provider, walletAddress, isMagic);
      setDepositStatus(status);
      
      if (!status.needsApproval && !status.needsCTFApproval) {
        setStep("complete");
      } else if (status.needsApproval) {
        setStep("approve_usdc");
      } else if (status.needsCTFApproval) {
        setStep("approve_ctf");
      }
    } catch (err) {
      console.error("Failed to check deposit status:", err);
      setError(err instanceof Error ? err.message : "Failed to check status");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUSDC = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      if (!signer) {
        throw new Error("No signer available");
      }
      
      // Approve CTF Exchange
      const result1 = await approveUSDCForExchange(signer);
      if (!result1.success) {
        throw new Error(result1.error || "Failed to approve USDC for CTF Exchange");
      }
      
      // Approve NegRisk CTF Exchange
      const result2 = await approveUSDCForNegRiskExchange(signer);
      if (!result2.success) {
        throw new Error(result2.error || "Failed to approve USDC for NegRisk Exchange");
      }
      
      setTxHash(result2.txHash || result1.txHash || null);
      
      // Re-check status
      await checkStatus();
      
      if (depositStatus?.needsCTFApproval) {
        setStep("approve_ctf");
      } else {
        setStep("complete");
      }
    } catch (err) {
      console.error("USDC approval failed:", err);
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCTF = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      if (!signer) {
        throw new Error("No signer available");
      }
      
      // Approve CTF for CTF Exchange
      const result1 = await approveCTFForExchange(signer);
      if (!result1.success) {
        throw new Error(result1.error || "Failed to approve CTF for Exchange");
      }
      
      // Approve CTF for NegRisk Exchange
      const result2 = await approveCTFForNegRiskExchange(signer);
      if (!result2.success) {
        throw new Error(result2.error || "Failed to approve CTF for NegRisk Exchange");
      }
      
      setTxHash(result2.txHash || result1.txHash || null);
      setStep("complete");
    } catch (err) {
      console.error("CTF approval failed:", err);
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderStep = () => {
    if (loading && step === "check") {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking your wallet status...</p>
        </div>
      );
    }

    switch (step) {
      case "check":
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Wallet</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {walletAddress ? formatAddress(walletAddress) : "Not connected"}
                  </p>
                </div>
                {walletType && (
                  <Badge variant="secondary" className="capitalize">
                    {walletType}
                  </Badge>
                )}
              </div>
            </Card>

            {depositStatus && (
              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">USDC Balance</span>
                  <span className="font-medium">${parseFloat(depositStatus.usdcBalance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">USDC Approved</span>
                  {!depositStatus.needsApproval ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="h-3 w-3 mr-1" /> Yes
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">CTF Tokens Approved</span>
                  {!depositStatus.needsCTFApproval ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="h-3 w-3 mr-1" /> Yes
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </div>
              </Card>
            )}

            <Button 
              onClick={checkStatus} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Refresh Status"
              )}
            </Button>
          </div>
        );

      case "approve_usdc":
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Approve USDC Spending</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allow Polymarket&apos;s exchange contracts to access your USDC for trading.
                  This is a one-time approval.
                </p>
              </div>
            </div>

            <Card className="p-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CTF Exchange</span>
                  <span className="font-mono">{formatAddress(POLYMARKET_CONTRACTS.CTF_EXCHANGE)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NegRisk Exchange</span>
                  <span className="font-mono">{formatAddress(POLYMARKET_CONTRACTS.NEG_RISK_CTF_EXCHANGE)}</span>
                </div>
              </div>
            </Card>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button 
              onClick={handleApproveUSDC} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  Approve USDC
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case "approve_ctf":
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Approve Conditional Tokens</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allow Polymarket to transfer your prediction market tokens.
                  Required for selling positions.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button 
              onClick={handleApproveCTF} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  Approve CTF Tokens
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="font-medium">Approvals Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your wallet is approved for Polymarket trading.
                </p>
              </div>
            </div>

            {depositStatus && (
              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">USDC in Wallet</span>
                  <span className="font-medium">${parseFloat(depositStatus.usdcBalance).toFixed(2)}</span>
                </div>
                {walletType === "magic" && depositStatus.proxyAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">USDC in Polymarket</span>
                    <span className="font-medium">
                      ${parseFloat(depositStatus.proxyBalance || "0").toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {depositStatus && parseFloat(depositStatus.usdcBalance) < 1 && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Deposit USDC to Trade</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You need USDC on Polygon to place orders. Visit Polymarket to deposit funds, 
                    or transfer USDC directly to your Polygon wallet.
                  </p>
                  <a
                    href="https://polymarket.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    data-testid="link-polymarket-deposit"
                  >
                    Deposit on Polymarket
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {txHash && (
              <a
                href={`https://polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-view-transaction"
              >
                View transaction
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <Button onClick={onClose} className="w-full" data-testid="button-done-deposit">
              Done
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error || "An unexpected error occurred"}
                </p>
              </div>
            </div>

            <Button onClick={checkStatus} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        );
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "check": return 1;
      case "approve_usdc": return 2;
      case "approve_ctf": return 3;
      case "complete": return 4;
      default: return 1;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Polymarket Trading</DialogTitle>
          <DialogDescription>
            Approve your wallet to trade on Polymarket prediction markets.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {step !== "error" && (
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`h-2 w-8 rounded-full transition-colors ${
                  num <= getStepNumber() 
                    ? "bg-primary" 
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
