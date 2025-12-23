import { ethers } from "ethers";

// Use server proxy to avoid CORS issues in production
const API_PROXY_BASE = "/api/polymarket";
const POLYGON_CHAIN_ID = 137;

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  outcomes: string[];
  tokenIds: string[];
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
  startDate: string;
  endDate: string;
  category: string;
  image?: string;
  createdAt: string;
}

export interface OrderArgs {
  price: number;
  size: number;
  side: "BUY" | "SELL";
  tokenId: string;
}

export interface PolymarketOrder {
  orderId: string;
  success: boolean;
  status: string;
  errorMsg?: string;
}

export async function fetchF1Markets(): Promise<PolymarketMarket[]> {
  try {
    // Use server proxy endpoint which already filters for F1 markets
    const response = await fetch(`${API_PROXY_BASE}/f1-markets/all`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.status}`);
    }
    
    const markets = await response.json();
    
    return markets.map((market: any) => ({
      id: market.condition_id || market.id,
      question: market.question,
      description: market.description,
      outcomes: market.outcomes || ["Yes", "No"],
      tokenIds: market.tokens?.map((t: any) => t.token_id) || [],
      active: market.active,
      closed: market.closed,
      volume: market.volume || "0",
      liquidity: market.liquidity || "0",
      startDate: market.start_date_iso || market.createdAt,
      endDate: market.end_date_iso || "",
      category: market.category || "Sports",
      image: market.image,
      createdAt: market.created_at || market.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching F1 markets:", error);
    return [];
  }
}

export async function fetchMarketPrices(tokenId: string): Promise<{ yes: number; no: number }> {
  try {
    // Use server proxy for price endpoint
    const response = await fetch(`${API_PROXY_BASE}/midpoint/${tokenId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      yes: parseFloat(data.mid || data.price || "0.5"),
      no: 1 - parseFloat(data.mid || data.price || "0.5"),
    };
  } catch (error) {
    console.error("Error fetching market prices:", error);
    return { yes: 0.5, no: 0.5 };
  }
}

export async function fetchOrderbook(tokenId: string): Promise<{
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
}> {
  try {
    // Use server proxy for orderbook endpoint
    const response = await fetch(`${API_PROXY_BASE}/orderbook/${tokenId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orderbook: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      bids: (data.bids || []).map((b: any) => ({
        price: parseFloat(b.price),
        size: parseFloat(b.size),
      })),
      asks: (data.asks || []).map((a: any) => ({
        price: parseFloat(a.price),
        size: parseFloat(a.size),
      })),
    };
  } catch (error) {
    console.error("Error fetching orderbook:", error);
    return { bids: [], asks: [] };
  }
}

export function formatUsdcAmount(amount: string | number, decimals: number = 2): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatProbability(price: number): string {
  return `${(price * 100).toFixed(1)}%`;
}
