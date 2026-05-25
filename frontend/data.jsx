// Seed data: plausible Indian-equity examples for the Tilt prototype.
// All numbers are hand-tuned to look realistic, not random.

const SECTORS = [
  { id: 'PSU_BANK',     name: 'PSU Banking',      momentum: 0.92, state: 'hot',     count: 8,  index: 7842.55, change: 1.84 },
  { id: 'CAPITAL_GOODS',name: 'Capital Goods',    momentum: 0.88, state: 'hot',     count: 11, index: 71204.30, change: 1.42 },
  { id: 'REALTY',       name: 'Realty',           momentum: 0.84, state: 'hot',     count: 6,  index: 1058.20, change: 1.18 },
  { id: 'INFRA',        name: 'Infrastructure',   momentum: 0.79, state: 'hot',     count: 9,  index: 9114.65, change: 0.96 },
  { id: 'AUTO',         name: 'Auto',             momentum: 0.71, state: 'hot',     count: 7,  index: 24560.10, change: 0.74 },
  { id: 'METAL',        name: 'Metals',           momentum: 0.62, state: 'neutral', count: 5,  index: 9342.85, change: 0.18 },
  { id: 'BANK',         name: 'Banking',          momentum: 0.58, state: 'neutral', count: 6,  index: 51288.40, change: 0.22 },
  { id: 'FIN_SERVICES', name: 'Fin. Services',    momentum: 0.54, state: 'neutral', count: 5,  index: 24180.15, change: 0.11 },
  { id: 'PVT_BANK',     name: 'Private Banking',  momentum: 0.49, state: 'neutral', count: 4,  index: 26110.75, change: -0.08 },
  { id: 'PHARMA',       name: 'Pharma',           momentum: 0.41, state: 'neutral', count: 3,  index: 22188.55, change: -0.32 },
  { id: 'HEALTHCARE',   name: 'Healthcare',       momentum: 0.38, state: 'neutral', count: 3,  index: 13540.10, change: -0.41 },
  { id: 'IT',           name: 'IT',               momentum: 0.21, state: 'cold',    count: 2,  index: 38120.40, change: -1.12 },
  { id: 'CONSUMER',     name: 'Consumer Durables',momentum: 0.18, state: 'cold',    count: 1,  index: 35492.10, change: -0.88 },
  { id: 'FMCG',         name: 'FMCG',             momentum: 0.12, state: 'cold',    count: 1,  index: 56210.05, change: -0.94 },
];

const STOCKS = [
  // Hot-sector conviction picks (rally signals)
  { ticker: 'BHEL',       name: 'Bharat Heavy Electricals', sector: 'Capital Goods',    sectorId: 'CAPITAL_GOODS', cmp: 312.40, change: 2.84,
    rsi: 58, macd: 1.42, ema20: 298.10, gap52: -8.4, score: 0.91, scoreParts: { momentum: 0.32, upside: 0.22, rsi: 0.19, sector: 0.18 } },
  { ticker: 'PFC',        name: 'Power Finance Corp',       sector: 'Fin. Services',    sectorId: 'FIN_SERVICES',  cmp: 484.25, change: 1.68,
    rsi: 56, macd: 0.94, ema20: 472.80, gap52: -6.1, score: 0.87, scoreParts: { momentum: 0.30, upside: 0.21, rsi: 0.18, sector: 0.18 } },
  { ticker: 'IRFC',       name: 'Indian Railway Finance',   sector: 'Fin. Services',    sectorId: 'FIN_SERVICES',  cmp: 158.90, change: 2.12,
    rsi: 54, macd: 0.61, ema20: 152.40, gap52: -11.2, score: 0.84, scoreParts: { momentum: 0.28, upside: 0.24, rsi: 0.17, sector: 0.15 } },
  { ticker: 'TATAPOWER',  name: 'Tata Power',               sector: 'Capital Goods',    sectorId: 'CAPITAL_GOODS', cmp: 412.85, change: 1.34,
    rsi: 61, macd: 0.88, ema20: 401.20, gap52: -4.2, score: 0.82, scoreParts: { momentum: 0.28, upside: 0.18, rsi: 0.20, sector: 0.16 } },
  { ticker: 'BANKBARODA', name: 'Bank of Baroda',           sector: 'PSU Banking',      sectorId: 'PSU_BANK',      cmp: 268.50, change: 1.92,
    rsi: 55, macd: 0.72, ema20: 261.30, gap52: -7.8, score: 0.81, scoreParts: { momentum: 0.27, upside: 0.20, rsi: 0.18, sector: 0.16 } },

  // Strong but just below conviction line
  { ticker: 'NTPC',       name: 'NTPC',                     sector: 'Capital Goods',    sectorId: 'CAPITAL_GOODS', cmp: 372.10, change: 0.94,
    rsi: 52, macd: 0.48, ema20: 365.40, gap52: -5.3, score: 0.77, scoreParts: { momentum: 0.25, upside: 0.18, rsi: 0.17, sector: 0.17 } },
  { ticker: 'IRCTC',      name: 'IRCTC',                    sector: 'Infrastructure',   sectorId: 'INFRA',         cmp: 802.40, change: 1.08,
    rsi: 50, macd: 0.42, ema20: 788.10, gap52: -9.6, score: 0.74, scoreParts: { momentum: 0.24, upside: 0.21, rsi: 0.15, sector: 0.14 } },
  { ticker: 'DLF',        name: 'DLF',                      sector: 'Realty',           sectorId: 'REALTY',        cmp: 810.20, change: 0.82,
    rsi: 49, macd: 0.33, ema20: 794.50, gap52: -10.2, score: 0.72, scoreParts: { momentum: 0.22, upside: 0.22, rsi: 0.14, sector: 0.14 } },
  { ticker: 'M&M',        name: 'Mahindra & Mahindra',      sector: 'Auto',             sectorId: 'AUTO',          cmp: 2854.50, change: 0.64,
    rsi: 53, macd: 0.51, ema20: 2812.40, gap52: -6.8, score: 0.71, scoreParts: { momentum: 0.24, upside: 0.18, rsi: 0.16, sector: 0.13 } },
  { ticker: 'SBIN',       name: 'State Bank of India',      sector: 'PSU Banking',      sectorId: 'PSU_BANK',      cmp: 762.30, change: 0.58,
    rsi: 51, macd: 0.36, ema20: 755.10, gap52: -7.4, score: 0.69, scoreParts: { momentum: 0.22, upside: 0.18, rsi: 0.15, sector: 0.14 } },

  // Mid pack — neutral
  { ticker: 'TATAMOTORS', name: 'Tata Motors',              sector: 'Auto',             sectorId: 'AUTO',          cmp: 982.40, change: 0.42,
    rsi: 48, macd: 0.22, ema20: 974.20, gap52: -12.4, score: 0.62, scoreParts: { momentum: 0.18, upside: 0.20, rsi: 0.13, sector: 0.11 } },
  { ticker: 'HINDALCO',   name: 'Hindalco Industries',      sector: 'Metals',           sectorId: 'METAL',         cmp: 642.10, change: 0.18,
    rsi: 46, macd: 0.14, ema20: 638.80, gap52: -14.1, score: 0.58, scoreParts: { momentum: 0.15, upside: 0.22, rsi: 0.12, sector: 0.09 } },
  { ticker: 'HDFCBANK',   name: 'HDFC Bank',                sector: 'Private Banking',  sectorId: 'PVT_BANK',      cmp: 1684.20, change: 0.08,
    rsi: 44, macd: 0.04, ema20: 1681.50, gap52: -3.8, score: 0.54, scoreParts: { momentum: 0.12, upside: 0.14, rsi: 0.14, sector: 0.14 } },
  { ticker: 'RELIANCE',   name: 'Reliance Industries',      sector: 'Fin. Services',    sectorId: 'FIN_SERVICES',  cmp: 2914.60, change: -0.32,
    rsi: 43, macd: -0.08, ema20: 2918.40, gap52: -8.2, score: 0.51, scoreParts: { momentum: 0.10, upside: 0.18, rsi: 0.11, sector: 0.12 } },
  { ticker: 'ICICIBANK',  name: 'ICICI Bank',               sector: 'Private Banking',  sectorId: 'PVT_BANK',      cmp: 1118.40, change: -0.18,
    rsi: 42, macd: -0.04, ema20: 1122.10, gap52: -4.6, score: 0.49, scoreParts: { momentum: 0.10, upside: 0.14, rsi: 0.11, sector: 0.14 } },

  // Cold — sells / traps
  { ticker: 'INFY',       name: 'Infosys',                  sector: 'IT',               sectorId: 'IT',            cmp: 1480.20, change: -1.42,
    rsi: 38, macd: -0.42, ema20: 1502.40, gap52: -16.8, score: 0.34, scoreParts: { momentum: 0.05, upside: 0.18, rsi: 0.07, sector: 0.04 } },
  { ticker: 'TCS',        name: 'Tata Consultancy Svcs',    sector: 'IT',               sectorId: 'IT',            cmp: 3812.40, change: -0.94,
    rsi: 41, macd: -0.31, ema20: 3854.10, gap52: -10.4, score: 0.38, scoreParts: { momentum: 0.07, upside: 0.16, rsi: 0.09, sector: 0.06 } },
  { ticker: 'SUNPHARMA',  name: 'Sun Pharmaceutical',       sector: 'Pharma',           sectorId: 'PHARMA',        cmp: 1542.80, change: -0.62,
    rsi: 39, macd: -0.18, ema20: 1556.30, gap52: -8.4, score: 0.41, scoreParts: { momentum: 0.08, upside: 0.16, rsi: 0.08, sector: 0.09 } },
  { ticker: 'HINDUNILVR', name: 'Hindustan Unilever',       sector: 'FMCG',             sectorId: 'FMCG',          cmp: 2384.10, change: -1.04,
    rsi: 36, macd: -0.38, ema20: 2412.40, gap52: -15.2, score: 0.31, scoreParts: { momentum: 0.04, upside: 0.18, rsi: 0.06, sector: 0.03 } },
  { ticker: 'NESTLEIND',  name: 'Nestle India',             sector: 'FMCG',             sectorId: 'FMCG',          cmp: 2418.50, change: -0.74,
    rsi: 40, macd: -0.22, ema20: 2436.10, gap52: -11.6, score: 0.36, scoreParts: { momentum: 0.06, upside: 0.16, rsi: 0.08, sector: 0.06 } },
];

const HOLDINGS = [
  { ticker: 'BHEL',       qty: 80,   avgBuy: 268.50, status: 'hold',    reason: 'Inside rally band, sector is Hot.' },
  { ticker: 'TATAPOWER',  qty: 50,   avgBuy: 382.10, status: 'hold',    reason: 'Above EMA20, MACD positive, sector Hot.' },
  { ticker: 'PFC',        qty: 40,   avgBuy: 412.40, status: 'hold',    reason: 'All four filters passing.' },
  { ticker: 'NTPC',       qty: 30,   avgBuy: 358.20, status: 'hold',    reason: '3/4 filters; RSI midband.' },
  { ticker: 'TATAMOTORS', qty: 25,   avgBuy: 1042.80, status: 'average', reason: 'Sector cooling; MACD flat. Average if it dips 4% more.' },
  { ticker: 'HDFCBANK',   qty: 20,   avgBuy: 1748.40, status: 'average', reason: 'Neutral sector; RSI weak but value gap > 12%.' },
  { ticker: 'INFY',       qty: 35,   avgBuy: 1612.30, status: 'sell',    reason: 'Sector Cold, MACD negative, below EMA20. Trap.' },
  { ticker: 'HINDUNILVR', qty: 15,   avgBuy: 2620.40, status: 'sell',    reason: 'RSI < 40, sector Cold, no value gap. Exit.' },
  { ticker: 'SUNPHARMA',  qty: 18,   avgBuy: 1612.10, status: 'sell',    reason: 'Failed 3 of 4 filters. Sector cooling.' },
];

// Synthetic 1-year OHLCV for the stock detail chart (BHEL as default).
// 252 trading days, roughly trending up with realistic vol clustering.
const _makeOHLC = (seed, days, base, trend, vol) => {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  let price = base;
  for (let i = 0; i < days; i++) {
    const drift = trend * (1 + (rnd() - 0.5) * 0.4);
    const noise = (rnd() - 0.5) * vol;
    const open = price;
    const close = Math.max(1, open * (1 + drift + noise));
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    const volume = 1_200_000 + Math.floor(rnd() * 2_800_000);
    out.push({ i, open, high, low, close, volume });
    price = close;
  }
  return out;
};

const STOCK_OHLC = _makeOHLC(73, 252, 198, 0.0021, 0.018);

// Backtest signals
const BACKTEST = {
  triggers: 184,
  hitRate: 0.612,
  avgReturn: 0.041,
  maxDD: -0.083,
  benchmarkReturn: 0.183,
  strategyReturn: 0.276,
  duration: 4.8,
  lastRun: 'Today, 09:14 IST',
};

const BACKTEST_SIGNALS = [
  { date: '2025-11-04', ticker: 'BHEL',       sector: 'Capital Goods', r5: 2.4, r15: 5.1, r30: 8.2, status: 'winner' },
  { date: '2025-10-28', ticker: 'PFC',        sector: 'Fin. Services', r5: 1.8, r15: 4.2, r30: 6.4, status: 'winner' },
  { date: '2025-10-22', ticker: 'IRFC',       sector: 'Fin. Services', r5: 0.4, r15: -0.8, r30: 1.2, status: 'flat' },
  { date: '2025-10-14', ticker: 'TATAPOWER',  sector: 'Capital Goods', r5: 3.1, r15: 6.4, r30: 9.8, status: 'winner' },
  { date: '2025-10-08', ticker: 'BANKBARODA', sector: 'PSU Banking',   r5: -1.2, r15: -2.4, r30: -1.8, status: 'loser' },
  { date: '2025-10-01', ticker: 'NTPC',       sector: 'Capital Goods', r5: 1.4, r15: 2.8, r30: 4.1, status: 'winner' },
  { date: '2025-09-24', ticker: 'IRCTC',      sector: 'Infrastructure',r5: 0.8, r15: 1.6, r30: 2.4, status: 'winner' },
  { date: '2025-09-18', ticker: 'DLF',        sector: 'Realty',        r5: -0.4, r15: 1.2, r30: 3.6, status: 'winner' },
  { date: '2025-09-10', ticker: 'M&M',        sector: 'Auto',          r5: 2.2, r15: 3.4, r30: 4.8, status: 'winner' },
  { date: '2025-09-03', ticker: 'SBIN',       sector: 'PSU Banking',   r5: -0.6, r15: -1.4, r30: -2.2, status: 'loser' },
  { date: '2025-08-26', ticker: 'BHEL',       sector: 'Capital Goods', r5: 1.6, r15: 3.8, r30: 5.4, status: 'winner' },
  { date: '2025-08-19', ticker: 'TATAPOWER',  sector: 'Capital Goods', r5: 0.2, r15: 0.4, r30: 0.6, status: 'flat' },
];

// Cumulative return series for the backtest chart (252 days)
const BACKTEST_CURVE = (() => {
  let s = 17;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const strat = [0], bench = [0];
  for (let i = 1; i < 252; i++) {
    strat.push(strat[i-1] + 0.0011 + (rnd() - 0.45) * 0.012);
    bench.push(bench[i-1] + 0.00075 + (rnd() - 0.50) * 0.010);
  }
  return { strat, bench };
})();

window.TiltData = { SECTORS, STOCKS, HOLDINGS, STOCK_OHLC, BACKTEST, BACKTEST_SIGNALS, BACKTEST_CURVE };
