// Binance WebSocket for Crypto (free, no API key)
type BinanceTicker = {
  s: string;  // Symbol (e.g., "BTCUSDT")
  c: string;  // Current price
  P: string;  // 24h price change percent
  q: string;  // 24h volume
};

// Forex REST API (free, no API key)
type ForexRate = {
  symbol: string;
  rate: number;
  change: number;
};

export class LiveMarketData {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (price: number, change24h: string) => void> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  // Connect to Binance for crypto
  connectCrypto() {
    this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const symbol = data.s;
      const price = parseFloat(data.c);
      const change24h = data.P;
      
      const callback = this.subscribers.get(symbol);
      if (callback) callback(price, change24h);
    };
    
    this.ws.onerror = (err) => console.error('WebSocket error:', err);
  }

  // For forex pairs (EUR/USD, GBP/USD)
  connectForex() {
    // Update every 5 seconds from free API
    this.updateInterval = setInterval(async () => {
      try {
        const response = await fetch('https://www.live-rates.com/rates');
        const data = await response.json();
        
        // Update EUR/USD
        const eurCallback = this.subscribers.get('EURUSD');
        if (eurCallback) eurCallback(data.EURUSD, data.EURUSD_Change || '0');
        
        // Update GBP/USD
        const gbpCallback = this.subscribers.get('GBPUSD');
        if (gbpCallback) gbpCallback(data.GBPUSD, data.GBPUSD_Change || '0');
      } catch (error) {
        console.error('Forex fetch error:', error);
      }
    }, 5000);
  }

  subscribe(symbol: string, callback: (price: number, change24h: string) => void) {
    this.subscribers.set(symbol, callback);
  }

  disconnect() {
    if (this.ws) this.ws.close();
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}

export const liveMarketData = new LiveMarketData();