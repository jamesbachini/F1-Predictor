import { ethers } from "ethers";

const POLYGON_RPC = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const POLYGON_CHAIN_ID = 137;

// USDC.e (bridged USDC) on Polygon - used by Polymarket
const USDC_CONTRACT_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_DECIMALS = 6;

const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

let provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  }
  return provider;
}

export async function validatePolygonAddress(address: string): Promise<boolean> {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, USDC_DECIMALS);
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return "0";
  }
}

export async function accountExists(address: string): Promise<boolean> {
  try {
    const isValid = await validatePolygonAddress(address);
    if (!isValid) return false;
    
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return true;
  } catch {
    return false;
  }
}

export function generateDepositMemo(): string {
  const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `F1PREDICT-${randomId}`;
}

export function getPlatformAddress(): string | null {
  return process.env.POLYGON_PLATFORM_ADDRESS || null;
}

export function formatUSDC(amount: number): bigint {
  return ethers.parseUnits(amount.toString(), USDC_DECIMALS);
}

export function parseUSDC(amount: bigint): number {
  return parseFloat(ethers.formatUnits(amount, USDC_DECIMALS));
}

export {
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  POLYGON_CHAIN_ID,
  POLYGON_RPC,
};
