type Subscriber = (price: number, change24h: string, high?: number, low?: number, volume?: number) => void;

class LiveMarketData {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Subscriber[]> = new Map();
  private forexInterval: NodeJS.Timeout | null = null;

  connectCrypto() {
    if (this.ws) return;
    
    this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const symbol = data.s;
      const price = parseFloat(data.c);
      const change24h = data.P;
      const high = parseFloat(data.h);
      const low = parseFloat(data.l);
      const volume = parseFloat(data.v);
      
      const subs = this.subscribers.get(symbol);
      if (subs) {
        subs.forEach(cb => cb(price, change24h, high, low, volume));
      }
    };
    
    this.ws.onerror = (err) => console.error('WebSocket error:', err);
    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting in 5s...');
      setTimeout(() => this.connectCrypto(), 5000);
    };
  }

  connectForex() {
    if (this.forexInterval) return;
    
    this.forexInterval = setInterval(async () => {
      try {
        const response = await fetch('https://www.live-rates.com/rates');
        const data = await response.json();
        
        const eurSubs = this.subscribers.get('EURUSD');
        if (eurSubs) {
          eurSubs.forEach(cb => cb(data.EURUSD, data.EURUSD_Change || '0'));
        }
        
        const gbpSubs = this.subscribers.get('GBPUSD');
        if (gbpSubs) {
          gbpSubs.forEach(cb => cb(data.GBPUSD, data.GBPUSD_Change || '0'));
        }
      } catch (error) {
        console.error('Forex fetch error:', error);
      }
    }, 5000);
  }

  subscribe(symbol: string, callback: Subscriber) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol)!.push(callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.forexInterval) {
      clearInterval(this.forexInterval);
      this.forexInterval = null;
    }
  }
}

export const liveMarketData = new LiveMarketData();