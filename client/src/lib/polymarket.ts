import { ethers } from "ethers";

const POLYMARKET_API_BASE = "https://clob.polymarket.com";
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
    const response = await fetch(`${POLYMARKET_API_BASE}/markets`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.status}`);
    }
    
    const markets = await response.json();
    
    const f1Markets = markets.filter((market: any) => {
      const question = market.question?.toLowerCase() || "";
      const description = market.description?.toLowerCase() || "";
      const category = market.category?.toLowerCase() || "";
      
      return (
        question.includes("formula 1") ||
        question.includes("formula one") ||
        question.includes("f1") ||
        description.includes("formula 1") ||
        description.includes("formula one") ||
        category.includes("motorsport") ||
        category.includes("f1")
      );
    });
    
    return f1Markets.map((market: any) => ({
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
    const response = await fetch(`${POLYMARKET_API_BASE}/prices?token_ids=${tokenId}`, {
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
      yes: parseFloat(data[tokenId] || "0.5"),
      no: 1 - parseFloat(data[tokenId] || "0.5"),
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
    const response = await fetch(`${POLYMARKET_API_BASE}/book?token_id=${tokenId}`, {
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
