import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface PolymarketOutcome {
  id: string;
  name: string;
  tokenId: string;
  yesTokenId?: string;
  noTokenId?: string;
  price: number;
  noPrice?: number;
  volume: string;
  conditionId: string;
  questionId: string;
  image?: string;
}

interface PriceHistoryResponse {
  history: Array<{ t: number; p: number }>;
}

interface PolymarketPriceChartProps {
  outcomes: PolymarketOutcome[];
  type: "constructors" | "drivers";
  selectedOutcome?: PolymarketOutcome | null;
  onSelectOutcome?: (outcome: PolymarketOutcome) => void;
}

const teamColors: Record<string, string> = {
  "McLaren": "#FF8700",
  "Red Bull Racing": "#1E41FF",
  "Ferrari": "#DC0000",
  "Mercedes": "#00D2BE",
  "Aston Martin": "#006F62",
  "Williams": "#005AFF",
  "Audi": "#FF0000",
  "Alpine": "#0090FF",
  "Cadillac": "#C4A747",
  "Haas": "#B6BABD",
  "Racing Bulls": "#2B4562",
  "Other": "#888888",
};

const driverColors: Record<string, string> = {
  "Max Verstappen": "#1E41FF",
  "Lando Norris": "#FF8700",
  "George Russell": "#00D2BE",
  "Oscar Piastri": "#FF8700",
  "Charles Leclerc": "#DC0000",
  "Lewis Hamilton": "#DC0000",
  "Kimi Antonelli": "#00D2BE",
  "Fernando Alonso": "#006F62",
};

type TimeRange = "1D" | "1W" | "1M" | "ALL";

const timeRanges: { key: TimeRange; label: string; interval: string; fidelity: string }[] = [
  { key: "1D", label: "1D", interval: "1d", fidelity: "5" },
  { key: "1W", label: "1W", interval: "1w", fidelity: "60" },
  { key: "1M", label: "1M", interval: "1m", fidelity: "60" },
  { key: "ALL", label: "All", interval: "all", fidelity: "60" },
];

export function PolymarketPriceChart({ 
  outcomes, 
  type,
  selectedOutcome,
  onSelectOutcome 
}: PolymarketPriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1W");
  const [hoveredOutcome, setHoveredOutcome] = useState<PolymarketOutcome | null>(null);

  const activeOutcome = hoveredOutcome || selectedOutcome || (outcomes.length > 0 ? outcomes[0] : null);
  const tokenId = activeOutcome?.yesTokenId || activeOutcome?.tokenId;
  
  const rangeConfig = timeRanges.find(r => r.key === timeRange) || timeRanges[3];

  const { data: priceHistory, isLoading } = useQuery<PriceHistoryResponse>({
    queryKey: ["/api/polymarket/price-history", tokenId, rangeConfig.interval, rangeConfig.fidelity],
    enabled: !!tokenId,
    refetchInterval: 30000,
  });

  const chartData = priceHistory?.history?.map(point => ({
    timestamp: point.t * 1000,
    price: point.p * 100,
  })) || [];

  const currentPrice = activeOutcome?.price || 0;
  const firstPrice = chartData.length > 0 ? chartData[0].price / 100 : currentPrice;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const colorKey = type === "constructors" ? teamColors : driverColors;
  const lineColor = activeOutcome ? (colorKey[activeOutcome.name] || "#8884d8") : "#8884d8";

  const formatXAxis = (timestamp: number) => {
    if (timeRange === "1D") {
      return format(new Date(timestamp), "HH:mm");
    } else if (timeRange === "1W") {
      return format(new Date(timestamp), "EEE");
    } else {
      return format(new Date(timestamp), "MMM d");
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { timestamp: number } }> }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const timestamp = payload[0].payload.timestamp;
      return (
        <div className="bg-popover border rounded-md px-3 py-2 shadow-lg">
          <p className="text-sm font-medium">{(value).toFixed(1)}c</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(timestamp), "MMM d, yyyy HH:mm")}
          </p>
        </div>
      );
    }
    return null;
  };

  const topOutcomes = [...outcomes]
    .filter(o => o.name !== "Other")
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {activeOutcome && (
                  <>
                    <span className="font-semibold text-lg">{activeOutcome.name}</span>
                    <Badge variant="outline" className="text-lg font-bold">
                      {(currentPrice * 100).toFixed(1)}c
                    </Badge>
                    <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{isPositive ? "+" : ""}{(priceChange * 100).toFixed(1)}c</span>
                      <span className="text-muted-foreground">({isPositive ? "+" : ""}{priceChangePercent.toFixed(1)}%)</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-1">
                {timeRanges.map(range => (
                  <Button
                    key={range.key}
                    variant={timeRange === range.key ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(range.key)}
                    data-testid={`button-range-${range.key.toLowerCase()}`}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No price history available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `${v.toFixed(0)}c`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={currentPrice * 100} stroke="#888" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: lineColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="lg:w-48 lg:border-l lg:pl-4">
            <p className="text-sm text-muted-foreground mb-2">Top {type === "constructors" ? "Teams" : "Drivers"}</p>
            <div className="space-y-1">
              {topOutcomes.map(outcome => {
                const isActive = activeOutcome?.id === outcome.id;
                const color = colorKey[outcome.name] || "#888";
                return (
                  <button
                    key={outcome.id}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left text-sm transition-colors hover-elevate ${
                      isActive ? "bg-muted" : ""
                    }`}
                    onMouseEnter={() => setHoveredOutcome(outcome)}
                    onMouseLeave={() => setHoveredOutcome(null)}
                    onClick={() => onSelectOutcome?.(outcome)}
                    data-testid={`chart-select-${outcome.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{outcome.name}</span>
                    </div>
                    <span className="font-medium">{(outcome.price * 100).toFixed(1)}c</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
