/**
 * Market Data Service
 * Simulates market data with realistic price movements and volatility
 */

export interface Candlestick {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceUpdate {
  instrument: string;
  ltp: number;
  bid: number;
  ask: number;
  timestamp: Date;
  candlestick?: Candlestick;
}

/**
 * Simulates realistic market price movements
 */
export class MarketDataSimulator {
  private priceHistory: Map<string, number[]> = new Map();
  private volatilityMap: Map<string, number> = new Map();

  constructor() {
    // Initialize with some base prices
    this.priceHistory.set("NIFTY", [20000]);
    this.priceHistory.set("BANKNIFTY", [45000]);
    this.priceHistory.set("SENSEX", [60000]);

    // Set volatility levels (percentage)
    this.volatilityMap.set("NIFTY", 0.5);
    this.volatilityMap.set("BANKNIFTY", 0.8);
    this.volatilityMap.set("SENSEX", 0.4);
  }

  /**
   * Generate next price using random walk with drift
   */
  private generatePrice(instrument: string, currentPrice: number): number {
    const volatility = this.volatilityMap.get(instrument) || 0.5;
    const drift = 0.0001; // Slight upward drift

    // Random walk with volatility
    const randomChange = (Math.random() - 0.5) * volatility;
    const newPrice = currentPrice * (1 + drift + randomChange / 100);

    return Math.max(newPrice, currentPrice * 0.95); // Prevent extreme drops
  }

  /**
   * Get current LTP for an instrument
   */
  getCurrentPrice(instrument: string): number {
    const history = this.priceHistory.get(instrument);
    if (!history || history.length === 0) {
      // Default price if not found
      return 20000;
    }
    return history[history.length - 1];
  }

  /**
   * Update prices and return new market data
   */
  updatePrices(): Map<string, PriceUpdate> {
    const updates = new Map<string, PriceUpdate>();

    this.priceHistory.forEach((history, instrument) => {
      const currentPrice = history[history.length - 1];
      const newPrice = this.generatePrice(instrument, currentPrice);

      history.push(newPrice);

      // Keep only last 100 prices for history
      if (history.length > 100) {
        history.shift();
      }

      const bid = newPrice * 0.999;
      const ask = newPrice * 1.001;

      updates.set(instrument, {
        instrument,
        ltp: newPrice,
        bid,
        ask,
        timestamp: new Date(),
      });
    });

    return updates;
  }

  /**
   * Generate candlestick data for a time period
   */
  generateCandlestick(
    instrument: string,
    startPrice: number,
    numTicks: number = 60
  ): Candlestick {
    let open = startPrice;
    let high = open;
    let low = open;
    let close = open;
    let volume = 0;

    for (let i = 0; i < numTicks; i++) {
      const volatility = this.volatilityMap.get(instrument) || 0.5;
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = close * (1 + randomChange / 100);

      high = Math.max(high, price);
      low = Math.min(low, price);
      close = price;
      volume += Math.floor(Math.random() * 1000) + 100;
    }

    return {
      timestamp: new Date(),
      open,
      high,
      low,
      close,
      volume,
    };
  }

  /**
   * Get historical candlesticks
   */
  getHistoricalCandlesticks(instrument: string, count: number = 50): Candlestick[] {
    const history = this.priceHistory.get(instrument) || [];
    const candlesticks: Candlestick[] = [];

    const pricesPerCandle = Math.max(1, Math.floor(history.length / count));

    for (let i = 0; i < history.length; i += pricesPerCandle) {
      const chunk = history.slice(i, i + pricesPerCandle);
      if (chunk.length === 0) continue;

      const open = chunk[0];
      const close = chunk[chunk.length - 1];
      const high = Math.max(...chunk);
      const low = Math.min(...chunk);

      candlesticks.push({
        timestamp: new Date(Date.now() - (history.length - i) * 1000),
        open,
        high,
        low,
        close,
        volume: chunk.length * 100,
      });
    }

    return candlesticks;
  }

  /**
   * Register a new instrument with initial price
   */
  registerInstrument(instrument: string, initialPrice: number, volatility: number = 0.5) {
    this.priceHistory.set(instrument, [initialPrice]);
    this.volatilityMap.set(instrument, volatility);
  }
}

/**
 * Global market data simulator instance
 */
let globalSimulator: MarketDataSimulator | null = null;

export function getMarketDataSimulator(): MarketDataSimulator {
  if (!globalSimulator) {
    globalSimulator = new MarketDataSimulator();
  }
  return globalSimulator;
}

/**
 * Helper to get current prices as a Map
 */
export function getCurrentPrices(instruments: string[]): Map<string, number> {
  const simulator = getMarketDataSimulator();
  const prices = new Map<string, number>();

  for (const instrument of instruments) {
    prices.set(instrument, simulator.getCurrentPrice(instrument));
  }

  return prices;
}
