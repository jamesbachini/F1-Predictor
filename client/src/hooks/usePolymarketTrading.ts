import { useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";

// Use server proxy to avoid CORS issues in production
const API_PROXY_BASE = "/api/polymarket";
const POLYGON_CHAIN_ID = 137;

interface ApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

interface BuilderHeaders {
  POLY_BUILDER_API_KEY: string;
  POLY_BUILDER_PASSPHRASE: string;
  POLY_BUILDER_SIGNATURE: string;
  POLY_BUILDER_TIMESTAMP: string;
}

async function fetchBuilderHeaders(
  method: string,
  path: string,
  body: string = ""
): Promise<BuilderHeaders | null> {
  try {
    const response = await fetch("/api/polymarket/builder-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, path, body }),
    });
    
    if (!response.ok) {
      console.warn("Builder signing not available");
      return null;
    }
    
    const data = await response.json();
    if (!data.available || !data.headers) {
      return null;
    }
    
    return data.headers;
  } catch (error) {
    console.warn("Failed to fetch builder headers:", error);
    return null;
  }
}

interface OrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: "BUY" | "SELL";
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

// Polymarket order EIP-712 domain and types for signing
const POLYMARKET_ORDER_DOMAIN = {
  name: "Polymarket CTF Exchange",
  version: "1",
  chainId: POLYGON_CHAIN_ID,
  verifyingContract: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as const, // CTF Exchange
};

const ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "taker", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiration", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "feeRateBps", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
  ],
};

async function generateHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string = ""
): Promise<string> {
  const message = timestamp + method.toUpperCase() + path + body;
  const encoder = new TextEncoder();
  const secretBytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  
  const signatureArray = new Uint8Array(signature);
  let hexString = "";
  for (let i = 0; i < signatureArray.length; i++) {
    hexString += signatureArray[i].toString(16).padStart(2, "0");
  }
  return hexString;
}

export function usePolymarketTrading() {
  const { walletAddress, signer, walletType } = useWallet();
  const isConnected = !!walletAddress;
  const [isDerivingCreds, setIsDerivingCreds] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const apiCredsRef = useRef<ApiCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Builder-only order placement - bypasses per-user API credential derivation
  // Uses EIP-712 signed order + builder credentials
  const placeBuilderOrder = useCallback(
    async (params: OrderParams): Promise<OrderResult> => {
      if (!signer || !walletAddress) {
        return { success: false, error: "Wallet not connected" };
      }

      setIsPlacingOrder(true);
      setError(null);

      try {
        // Convert price/size to amounts (6 decimals for USDC)
        const USDC_DECIMALS = 6;
        const priceScaled = Math.round(params.price * 100); // Price in cents (0-100)
        const sizeScaled = Math.round(params.size * Math.pow(10, USDC_DECIMALS));
        
        // For BUY orders: makerAmount = collateral (price * size), takerAmount = size
        // For SELL orders: makerAmount = size, takerAmount = collateral
        const isBuy = params.side === "BUY";
        const collateral = Math.round(params.price * params.size * Math.pow(10, USDC_DECIMALS));
        
        const makerAmount = isBuy ? collateral.toString() : sizeScaled.toString();
        const takerAmount = isBuy ? sizeScaled.toString() : collateral.toString();

        // Build the order struct for EIP-712 signing
        const salt = Date.now().toString() + Math.floor(Math.random() * 1000000);
        const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
        const nonce = Date.now();

        const orderStruct = {
          salt: salt,
          maker: walletAddress,
          signer: walletAddress,
          taker: "0x0000000000000000000000000000000000000000", // Anyone can fill
          tokenId: params.tokenId,
          makerAmount: makerAmount,
          takerAmount: takerAmount,
          expiration: expiration.toString(),
          nonce: nonce.toString(),
          feeRateBps: "0", // No fee
          side: isBuy ? 0 : 1, // 0 = BUY, 1 = SELL
          signatureType: 0, // EOA signature
        };

        console.log("Signing order with EIP-712:", orderStruct);

        // Sign the order using EIP-712
        let signature: string;
        
        const typedDataPayload = JSON.stringify({
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            ...ORDER_TYPES,
          },
          primaryType: "Order",
          domain: POLYMARKET_ORDER_DOMAIN,
          message: orderStruct,
        });

        if (walletType === "magic" && signer.provider) {
          const provider = signer.provider as ethers.BrowserProvider;
          signature = await provider.send("eth_signTypedData_v4", [
            walletAddress,
            typedDataPayload,
          ]);
        } else {
          signature = await (signer as any).signTypedData(
            POLYMARKET_ORDER_DOMAIN,
            ORDER_TYPES,
            orderStruct
          );
        }

        console.log("Order signed, submitting via builder endpoint");

        // Submit to builder-order endpoint (server uses builder credentials)
        const response = await fetch(`${API_PROXY_BASE}/builder-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: {
              tokenID: params.tokenId,
              price: params.price,
              size: params.size,
              type: "GTC",
              salt: orderStruct.salt,
              maker: orderStruct.maker,
              signer: orderStruct.signer,
              taker: orderStruct.taker,
              makerAmount: orderStruct.makerAmount,
              takerAmount: orderStruct.takerAmount,
              expiration: orderStruct.expiration,
              nonce: orderStruct.nonce,
              feeRateBps: orderStruct.feeRateBps,
              side: orderStruct.side,
              signatureType: orderStruct.signatureType,
            },
            userSignature: signature,
            walletAddress,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Builder order failed:", errorData);
          throw new Error(errorData.error || `Order failed: ${response.status}`);
        }

        const result = await response.json();
        return {
          success: true,
          orderId: result.orderID || result.id,
        };
      } catch (err: any) {
        console.error("Builder order error:", err);
        setError(err.message || "Failed to place order");
        return {
          success: false,
          error: err.message || "Failed to place order",
        };
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [signer, walletAddress, walletType]
  );

  const deriveApiCredentials = useCallback(async (): Promise<ApiCredentials | null> => {
    if (!signer || !walletAddress) {
      setError("Wallet not connected");
      return null;
    }

    if (apiCredsRef.current) {
      return apiCredsRef.current;
    }

    setIsDerivingCreds(true);
    setError(null);

    try {
      const nonce = Date.now();
      const domain = {
        name: "ClobAuthDomain",
        version: "1",
        chainId: POLYGON_CHAIN_ID,
      };

      const types = {
        ClobAuth: [
          { name: "address", type: "address" },
          { name: "timestamp", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "message", type: "string" },
        ],
      };

      const value = {
        address: walletAddress,
        timestamp: String(nonce),
        nonce: nonce,
        message: "This message attests that I control the given wallet",
      };

      const typedDataPayload = JSON.stringify({
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
          ],
          ...types,
        },
        primaryType: "ClobAuth",
        domain,
        message: value,
      });

      let signature: string;
      
      if (walletType === "magic" && signer.provider) {
        const provider = signer.provider as ethers.BrowserProvider;
        signature = await provider.send("eth_signTypedData_v4", [
          walletAddress,
          typedDataPayload,
        ]);
      } else {
        signature = await (signer as any).signTypedData(domain, types, value);
      }

      // Use server proxy to avoid CORS issues in production
      const response = await fetch(`${API_PROXY_BASE}/derive-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          timestamp: String(nonce),
          nonce,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const creds = await response.json();
      const apiCredentials: ApiCredentials = {
        apiKey: creds.apiKey,
        secret: creds.secret,
        passphrase: creds.passphrase,
      };

      apiCredsRef.current = apiCredentials;
      return apiCredentials;
    } catch (err: any) {
      console.error("Failed to derive API credentials:", err);
      setError(err.message || "Failed to derive API credentials");
      return null;
    } finally {
      setIsDerivingCreds(false);
    }
  }, [signer, walletAddress, walletType]);

  const ensureApiCredentials = useCallback(async (): Promise<ApiCredentials | null> => {
    if (apiCredsRef.current) return apiCredsRef.current;
    return deriveApiCredentials();
  }, [deriveApiCredentials]);

  const placeOrder = useCallback(
    async (params: OrderParams): Promise<OrderResult> => {
      if (!signer || !walletAddress) {
        return { success: false, error: "Wallet not connected" };
      }

      const creds = await ensureApiCredentials();
      if (!creds) {
        return { success: false, error: "Failed to get API credentials" };
      }

      try {
        const orderData = {
          tokenID: params.tokenId,
          price: params.price,
          size: params.size,
          side: params.side,
          type: "GTC",
        };

        const timestamp = String(Date.now());
        const method = "POST";
        const path = "/order";
        const body = JSON.stringify(orderData);
        
        const hmacSignature = await generateHmacSignature(
          creds.secret,
          timestamp,
          method,
          path,
          body
        );

        const builderHeaders = await fetchBuilderHeaders(method, path, body);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "POLY_ADDRESS": walletAddress,
          "POLY_SIGNATURE": hmacSignature,
          "POLY_TIMESTAMP": timestamp,
          "POLY_NONCE": timestamp,
          "POLY_API_KEY": creds.apiKey,
          "POLY_PASSPHRASE": creds.passphrase,
        };

        if (builderHeaders) {
          headers["POLY_BUILDER_API_KEY"] = builderHeaders.POLY_BUILDER_API_KEY;
          headers["POLY_BUILDER_PASSPHRASE"] = builderHeaders.POLY_BUILDER_PASSPHRASE;
          headers["POLY_BUILDER_SIGNATURE"] = builderHeaders.POLY_BUILDER_SIGNATURE;
          headers["POLY_BUILDER_TIMESTAMP"] = builderHeaders.POLY_BUILDER_TIMESTAMP;
        }

        // Use server proxy to avoid CORS issues in production
        const response = await fetch(`${API_PROXY_BASE}/clob-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method,
            path,
            body: orderData,
            credentials: {
              apiKey: creds.apiKey,
              secret: creds.secret,
              passphrase: creds.passphrase,
            },
            walletAddress,
            builderHeaders: builderHeaders || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Order placement failed:", { 
            status: response.status, 
            error: errorData 
          });
          const errorMessage = errorData.details?.error || errorData.error || errorData.message || `Order failed: ${response.status}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        return {
          success: true,
          orderId: result.orderID || result.id,
        };
      } catch (err: any) {
        console.error("Failed to place order:", err);
        return {
          success: false,
          error: err.message || "Failed to place order",
        };
      }
    },
    [signer, walletAddress, ensureApiCredentials]
  );

  const cancelOrder = useCallback(
    async (orderId: string): Promise<{ success: boolean; error?: string }> => {
      if (!signer || !walletAddress) {
        return { success: false, error: "Wallet not connected" };
      }

      const creds = await ensureApiCredentials();
      if (!creds) {
        return { success: false, error: "Failed to get API credentials" };
      }

      try {
        const timestamp = String(Date.now());
        const method = "DELETE";
        const path = `/order/${orderId}`;
        
        const hmacSignature = await generateHmacSignature(
          creds.secret,
          timestamp,
          method,
          path
        );

        const builderHeaders = await fetchBuilderHeaders(method, path);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "POLY_ADDRESS": walletAddress,
          "POLY_SIGNATURE": hmacSignature,
          "POLY_TIMESTAMP": timestamp,
          "POLY_NONCE": timestamp,
          "POLY_API_KEY": creds.apiKey,
          "POLY_PASSPHRASE": creds.passphrase,
        };

        if (builderHeaders) {
          headers["POLY_BUILDER_API_KEY"] = builderHeaders.POLY_BUILDER_API_KEY;
          headers["POLY_BUILDER_PASSPHRASE"] = builderHeaders.POLY_BUILDER_PASSPHRASE;
          headers["POLY_BUILDER_SIGNATURE"] = builderHeaders.POLY_BUILDER_SIGNATURE;
          headers["POLY_BUILDER_TIMESTAMP"] = builderHeaders.POLY_BUILDER_TIMESTAMP;
        }

        // Use server proxy to avoid CORS issues in production
        const response = await fetch(`${API_PROXY_BASE}/clob-proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method,
            path,
            credentials: {
              apiKey: creds.apiKey,
              secret: creds.secret,
              passphrase: creds.passphrase,
            },
            walletAddress,
            builderHeaders: builderHeaders || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `Cancel failed: ${response.status}`);
        }

        return { success: true };
      } catch (err: any) {
        console.error("Failed to cancel order:", err);
        return {
          success: false,
          error: err.message || "Failed to cancel order",
        };
      }
    },
    [signer, walletAddress, ensureApiCredentials]
  );

  const getOpenOrders = useCallback(async () => {
    if (!walletAddress) {
      return [];
    }

    const creds = await ensureApiCredentials();
    if (!creds) {
      return [];
    }

    try {
      const timestamp = String(Date.now());
      const method = "GET";
      const path = `/orders?owner=${walletAddress}`;
      
      const hmacSignature = await generateHmacSignature(
        creds.secret,
        timestamp,
        method,
        path
      );

      // Use server proxy to avoid CORS issues in production
      const response = await fetch(`${API_PROXY_BASE}/clob-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          path,
          credentials: {
            apiKey: creds.apiKey,
            secret: creds.secret,
            passphrase: creds.passphrase,
          },
          walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("Failed to fetch open orders:", err);
      return [];
    }
  }, [walletAddress, ensureApiCredentials]);

  const clearCredentials = useCallback(() => {
    apiCredsRef.current = null;
  }, []);

  return {
    isConnected,
    walletAddress,
    isDerivingCreds,
    isPlacingOrder,
    hasApiCreds: !!apiCredsRef.current,
    error,
    deriveApiCredentials,
    placeOrder,
    placeBuilderOrder,
    cancelOrder,
    getOpenOrders,
    clearCredentials,
  };
}
