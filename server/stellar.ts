import * as Stellar from "@stellar/stellar-sdk";

const USE_TESTNET = true;

const HORIZON_URL = USE_TESTNET 
  ? "https://horizon-testnet.stellar.org"
  : "https://horizon.stellar.org";

const NETWORK_PASSPHRASE = USE_TESTNET 
  ? Stellar.Networks.TESTNET 
  : Stellar.Networks.PUBLIC;

const USDC_ISSUER = USE_TESTNET
  ? "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
  : "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const USDC_ASSET = new Stellar.Asset("USDC", USDC_ISSUER);

const server = new Stellar.Horizon.Server(HORIZON_URL);

export interface StellarBalance {
  asset: string;
  balance: string;
}

export async function getAccountBalances(publicKey: string): Promise<StellarBalance[]> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.map((b: any) => ({
      asset: b.asset_type === "native" ? "XLM" : b.asset_code,
      balance: b.balance,
    }));
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getUSDCBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const usdcBalance = account.balances.find(
      (b: any) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
    );
    return usdcBalance ? usdcBalance.balance : "0";
  } catch (error: any) {
    if (error.response?.status === 404) {
      return "0";
    }
    throw error;
  }
}

export async function validateStellarAddress(publicKey: string): Promise<boolean> {
  try {
    Stellar.StrKey.decodeEd25519PublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
}

export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function hasUSDCTrustline(publicKey: string): Promise<boolean> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.some(
      (b: any) => b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER
    );
  } catch {
    return false;
  }
}

export async function getRecentUSDCPayments(publicKey: string, limit: number = 10) {
  try {
    const payments = await server
      .payments()
      .forAccount(publicKey)
      .order("desc")
      .limit(limit)
      .call();

    return payments.records
      .filter((p: any) => p.asset_code === "USDC" && p.asset_issuer === USDC_ISSUER)
      .map((p: any) => ({
        id: p.id,
        from: p.from,
        to: p.to,
        amount: p.amount,
        createdAt: p.created_at,
        transactionHash: p.transaction_hash,
      }));
  } catch {
    return [];
  }
}

export function generateDepositMemo(userId: string): string {
  return userId.slice(0, 28);
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export async function sendUSDCPayment(
  destinationAddress: string,
  amount: string,
  memo?: string
): Promise<TransferResult> {
  try {
    const secretKey = process.env.STELLAR_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Master wallet not configured" };
    }

    const sourceKeypair = Stellar.Keypair.fromSecret(secretKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    // Load source account
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    // Verify destination exists and has USDC trustline
    const destExists = await accountExists(destinationAddress);
    if (!destExists) {
      return { success: false, error: "Destination account does not exist" };
    }

    const hasTrustline = await hasUSDCTrustline(destinationAddress);
    if (!hasTrustline) {
      return { success: false, error: "Destination account does not have USDC trustline" };
    }

    // Build the transaction
    let transactionBuilder = new Stellar.TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Stellar.Operation.payment({
          destination: destinationAddress,
          asset: USDC_ASSET,
          amount: amount,
        })
      )
      .setTimeout(180);

    // Add memo if provided
    if (memo) {
      transactionBuilder = transactionBuilder.addMemo(Stellar.Memo.text(memo.slice(0, 28)));
    }

    const transaction = transactionBuilder.build();

    // Sign the transaction
    transaction.sign(sourceKeypair);

    // Submit to the network
    const result = await server.submitTransaction(transaction);
    
    return { 
      success: true, 
      transactionHash: result.hash 
    };
  } catch (error: any) {
    console.error("USDC payment error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to send USDC payment" 
    };
  }
}

export interface BuildTransactionResult {
  success: boolean;
  xdr?: string;
  networkPassphrase?: string;
  error?: string;
}

// Build an unsigned transaction for the user to sign with Freighter
export async function buildUSDCPaymentTransaction(
  sourceAddress: string,
  amount: string,
  memo?: string
): Promise<BuildTransactionResult> {
  try {
    const secretKey = process.env.STELLAR_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Platform wallet not configured" };
    }

    const platformKeypair = Stellar.Keypair.fromSecret(secretKey);
    const platformAddress = platformKeypair.publicKey();

    // Load source account (user's account)
    const sourceAccount = await server.loadAccount(sourceAddress);

    // Build the transaction - user pays USDC to platform
    let transactionBuilder = new Stellar.TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Stellar.Operation.payment({
          destination: platformAddress,
          asset: USDC_ASSET,
          amount: amount,
        })
      )
      .setTimeout(180);

    // Add memo if provided
    if (memo) {
      transactionBuilder = transactionBuilder.addMemo(Stellar.Memo.text(memo.slice(0, 28)));
    }

    const transaction = transactionBuilder.build();

    return {
      success: true,
      xdr: transaction.toXDR(),
      networkPassphrase: NETWORK_PASSPHRASE,
    };
  } catch (error: any) {
    console.error("Build transaction error:", error);
    return {
      success: false,
      error: error.message || "Failed to build transaction",
    };
  }
}

export interface TransactionValidation {
  valid: boolean;
  error?: string;
  sourceAccount?: string;
  destinationAccount?: string;
  amount?: string;
  asset?: string;
}

// Verify a signed transaction before submission
export function verifySignedTransaction(
  signedXdr: string,
  expectedSource: string,
  expectedAmount: string
): TransactionValidation {
  try {
    const parsed = Stellar.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    // Reject fee bump transactions
    if (parsed instanceof Stellar.FeeBumpTransaction) {
      return { valid: false, error: "Fee bump transactions not supported" };
    }

    const transaction = parsed as Stellar.Transaction;

    const platformAddress = getPlatformAddress();
    if (!platformAddress) {
      return { valid: false, error: "Platform wallet not configured" };
    }

    // Check source account
    const sourceAccount = transaction.source;
    if (sourceAccount !== expectedSource) {
      return { 
        valid: false, 
        error: `Invalid source account. Expected ${expectedSource.slice(0, 8)}..., got ${sourceAccount.slice(0, 8)}...` 
      };
    }

    // Check operations
    const operations = transaction.operations;
    if (operations.length !== 1) {
      return { valid: false, error: "Transaction must have exactly one operation" };
    }

    const op = operations[0] as Stellar.Operation.Payment;
    if (op.type !== "payment") {
      return { valid: false, error: "Transaction must be a payment operation" };
    }

    // Verify destination is platform wallet
    if (op.destination !== platformAddress) {
      return { 
        valid: false, 
        error: `Invalid destination. Payment must go to platform wallet.` 
      };
    }

    // Verify asset is USDC
    const asset = op.asset as Stellar.Asset;
    if (asset.code !== "USDC" || asset.issuer !== USDC_ISSUER) {
      return { valid: false, error: "Transaction must pay USDC" };
    }

    // Verify amount matches expected (with small tolerance for rounding)
    const txAmount = parseFloat(op.amount);
    const expected = parseFloat(expectedAmount);
    if (Math.abs(txAmount - expected) > 0.0001) {
      return { 
        valid: false, 
        error: `Invalid amount. Expected $${expected.toFixed(2)}, got $${txAmount.toFixed(2)}` 
      };
    }

    return {
      valid: true,
      sourceAccount,
      destinationAccount: op.destination,
      amount: op.amount,
      asset: `${asset.code}:${asset.issuer}`,
    };
  } catch (error: any) {
    return { valid: false, error: "Failed to parse transaction: " + error.message };
  }
}

// Submit a signed transaction to the network
export async function submitSignedTransaction(
  signedXdr: string
): Promise<TransferResult> {
  try {
    const transaction = Stellar.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    const result = await server.submitTransaction(transaction);

    return {
      success: true,
      transactionHash: result.hash,
    };
  } catch (error: any) {
    console.error("Submit transaction error:", error);
    
    // Parse Stellar error for better messaging
    let errorMessage = "Failed to submit transaction";
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      if (codes.operations?.includes("op_underfunded")) {
        errorMessage = "Insufficient USDC balance";
      } else if (codes.transaction === "tx_bad_auth") {
        errorMessage = "Transaction signature invalid";
      } else {
        errorMessage = `Transaction failed: ${JSON.stringify(codes)}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export function getPlatformAddress(): string | null {
  const secretKey = process.env.STELLAR_SECRET_KEY;
  if (!secretKey) return null;
  return Stellar.Keypair.fromSecret(secretKey).publicKey();
}

export {
  USDC_ASSET,
  USDC_ISSUER,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  USE_TESTNET,
  server,
};
