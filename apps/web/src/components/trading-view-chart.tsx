'use client';

import { useEffect, useRef, memo } from 'react';

/**
 * TradingView Advanced Chart widget.
 *
 * Loads the official embed script and mounts the advanced real-time chart with
 * candlesticks, indicators (RSI/MACD/EMA/SMA), drawing tools, multiple timeframes
 * and fullscreen — all built into the widget. We map our internal symbols to
 * TradingView symbols (e.g. BTCUSDT -> BINANCE:BTCUSDT, EURUSD -> FX:EURUSD).
 *
 * For a licensed deployment you would swap this for the self-hosted
 * "charting_library" pointed at our own /market/candles datafeed.
 */
function mapSymbol(symbol: string, type: 'CRYPTO' | 'FOREX'): string {
  // USDT/USDT is a $1.00 stablecoin pair with no native chart — show USDC/USDT (≈1.00).
  if (symbol === 'USDTUSDT') return 'BINANCE:USDCUSDT';
  if (type === 'FOREX') {
    if (symbol === 'XAUUSD') return 'OANDA:XAUUSD';
    if (symbol === 'XAGUSD') return 'OANDA:XAGUSD';
    return `FX:${symbol}`;
  }
  return `BINANCE:${symbol}`;
}

interface Props {
  symbol: string;
  type: 'CRYPTO' | 'FOREX';
  height?: number;
}

function TradingViewChartBase({ symbol, type, height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: mapSymbol(symbol, type),
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(10,11,13,1)',
      gridColor: 'rgba(35,39,47,0.5)',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      studies: ['STD;RSI', 'STD;MACD', 'STD;EMA'],
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, type]);

  return (
    <div className="tradingview-widget-container card overflow-hidden" style={{ height }}>
      <div ref={containerRef} className="tradingview-widget-container__widget h-full" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartBase);
