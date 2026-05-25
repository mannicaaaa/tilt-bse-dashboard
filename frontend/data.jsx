// Tilt v2 — STATIC CONFIG ONLY.
//
// Live market data (SECTORS, STOCKS, HOLDINGS, STOCK_OHLC) is fetched from
// the FastAPI backend by api.js and merged into window.TiltV2 at runtime.
// What lives here is *product configuration* that doesn't change per-request:
//
//   - LANES        — the 3 recommendation buckets (Strong/Momentum/Value)
//                    with their plain-English labels and accent colors.
//   - MUTUAL_FUNDS — top Indian equity MF snapshot. No public API exists for
//                    Indian MF portfolio holdings; this is a monthly-refresh
//                    hand-curated snapshot from AMC factsheets. Production
//                    upgrade path: Tickertape/ValueResearch paid API behind
//                    the same MFHoldingsProvider interface.
//   - STRATEGY_BACKTEST — per-lane historical metrics. Hard-coded for now;
//                    will be wired to /backtest endpoint per lane later.

const V2_LANES = [
  {
    id: 'strong',
    label: 'Looking strong',
    accent: '#22D3A4',
    accentClass: 'lane-strong',
    blurb: 'Every signal we watch is positive. Rising trend, sitting at a comfortable price, still has room to run.',
    filterPlain: 'These are the cleanest picks. Trend is up, price is above the 20-day average, the stock is not overbought, and it is still 15% or more below its yearly high — so there is room to grow.',
  },
  {
    id: 'momentum',
    label: 'Picking up speed',
    accent: '#7DD3FC',
    accentClass: 'lane-momentum',
    blurb: 'Already moving up. Faster entries, less margin for error if the move reverses.',
    filterPlain: 'These stocks are in an active uptrend right now. The technicals are positive, but they have already moved up some, so the entry is later and the cushion is smaller.',
  },
  {
    id: 'value',
    label: 'Beaten down — could bounce',
    accent: '#FBBF24',
    accentClass: 'lane-value',
    blurb: 'Sold off heavily. Contrarian entry — needs patience, but recoveries can be large.',
    filterPlain: 'These stocks have fallen far enough that they look oversold and the price has plenty of catch-up to do. Trend has not turned yet, so it is a contrarian, longer-hold bet.',
  },
  {
    id: 'smart_money',
    label: 'Smart money is buying',
    accent: '#A78BFA',
    accentClass: 'lane-smart',
    blurb: 'Held by top Indian mutual funds and passing at least one technical sanity check.',
    filterPlain: 'These are stocks that top mutual funds hold in their portfolios. The funds did the fundamental research; we only show the ones that also look reasonable on technicals — positive momentum, oversold, or sitting on a clear discount to their yearly high.',
  },
];

// Top Indian equity funds with their largest holdings. Hand-curated snapshot —
// see module docstring above.
const V2_MUTUAL_FUNDS = [
  { name: 'ICICI Prudential Bluechip', short: 'ICICI Pru Bluechip', type: 'Large Cap', aum: 65420, lastFiling: 'Apr 2026', holdings: ['BHEL', 'BANKBARODA', 'PFC', 'TATAPOWER', 'NTPC', 'SBIN'] },
  { name: 'SBI Magnum Multicap',       short: 'SBI Multicap',       type: 'Multi Cap', aum: 28950, lastFiling: 'Apr 2026', holdings: ['BHEL', 'PFC', 'IRFC', 'BANKBARODA', 'HDFCBANK'] },
  { name: 'Mirae Asset Large Cap',     short: 'Mirae Large Cap',    type: 'Large Cap', aum: 38410, lastFiling: 'Apr 2026', holdings: ['BHEL', 'TATAPOWER', 'M&M', 'DLF', 'IRCTC', 'ICICIBANK'] },
  { name: 'Parag Parikh Flexi Cap',    short: 'Parag Parikh Flexi', type: 'Flexi Cap', aum: 75820, lastFiling: 'Apr 2026', holdings: ['IRCTC', 'DLF', 'IRFC', 'INFY'] },
  { name: 'Nippon India Multi Cap',    short: 'Nippon Multi Cap',   type: 'Multi Cap', aum: 29440, lastFiling: 'Apr 2026', holdings: ['BANKBARODA', 'PFC', 'TATAPOWER', 'SUNPHARMA'] },
  { name: 'HDFC Top 100',              short: 'HDFC Top 100',       type: 'Large Cap', aum: 32140, lastFiling: 'Apr 2026', holdings: ['TATAPOWER', 'M&M', 'IRCTC', 'HINDUNILVR'] },
];

// Per-lane historical performance — to be wired to /backtest later.
const V2_STRATEGY_BACKTEST = {
  strong:   { triggers: 47, hitRate: 0.64, avgReturn: 4.2, window: '12 months', label: 'Looking strong' },
  momentum: { triggers: 83, hitRate: 0.58, avgReturn: 3.4, window: '12 months', label: 'Picking up speed' },
  value:    { triggers: 54, hitRate: 0.48, avgReturn: 5.8, window: '12 months', label: 'Beaten down — could bounce' },
};

// Initial window.TiltV2 — market arrays are empty; api.js fills them on mount.
window.TiltV2 = {
  SECTORS: [],
  STOCKS: [],
  HOLDINGS: [],
  STOCK_OHLC: [],
  STRATEGY_BACKTEST: V2_STRATEGY_BACKTEST,
  LANES: V2_LANES,
  MUTUAL_FUNDS: V2_MUTUAL_FUNDS,
};
