// Mock data shaped to match the FastAPI contract documented in the brief.
window.TILT_DATA = {
  snapshot_date: "2026-03-27",
  market_read:
    "Indian markets opened in a corrective phase today. The Value lane is broad at 23 candidates while only 1 stock cleared the strict Strong filter — capital is rotating into oversold quality, not chasing momentum. IT and Pharma are the strongest sectors by relative momentum, while Realty and PSU Bank continue to bleed.",
  scan_stats: {
    tickers_scanned: 93,
    total_picks: 34,
    lane_counts: { strong: 1, momentum: 6, value: 23, smart_money: 4 },
  },
  hero: {
    ticker: "PERSISTENT",
    name: "Persistent Systems",
    lane: "smart_money",
    cmp: 4892.30,
    change_pct: 1.84,
    change_abs: 88.40,
    score: 0.78,
    thesis:
      "Persistent Systems is showing a clean technical setup — MACD turned positive 8 days ago, price has held above its 20-day moving average, and RSI at 56 sits in the entry sweet spot with room to run. Held by HDFC Pharma & Healthcare and ICICI Pru Technology, adding fundamental conviction to the technical signal. The IT sector backdrop is the strongest today by constituent momentum, providing tailwind.",
    why_this:
      "Of 93 stocks scanned today, only 1 cleared all 4 Strong-lane conditions and 4 cleared Smart Money — Persistent is the only name on both lists.",
    indicators: {
      rsi: 56,
      macd_days_positive: 8,
      ema20_distance_pct: 4.2,
      week52_high_distance_pct: -11.0,
      volume_vs_30d_pct: -8,
      sector_state: "hot",
    },
    score_breakdown: {
      momentum: 0.31,
      upside: 0.19,
      rsi: 0.15,
      sector: 0.13,
    },
    pros: [
      "MACD crossed positive 8 days ago",
      "Above EMA20 by 4.2%",
      "RSI 56 sits inside 40–68 entry band",
      "Trading 11% below 52-week high",
    ],
    cons: [
      "Volume tracking 8% below 30-day average",
      "Sector breadth narrow — IT carrying the index",
    ],
    mf_context: {
      held_by_count: 2,
      funds: ["HDFC Pharma & Healthcare", "ICICI Pru Technology"],
    },
  },
  supporting: [
    {
      ticker: "TCS",
      name: "Tata Consultancy Services",
      lane: "strong",
      cmp: 3812.40,
      change_pct: 0.94,
      score: 0.74,
      thesis_short:
        "MACD just turned positive after two weeks of base-building above the 200-day.",
      mf_funds: ["ICICI Pru Bluechip", "Mirae Large Cap"],
      cleared: true,
    },
    {
      ticker: "INFY",
      name: "Infosys",
      lane: "value",
      cmp: 1480.20,
      change_pct: -1.42,
      score: 0.62,
      thesis_short:
        "Oversold at RSI 32 with 16.8% discount to 52-week high. Earnings revision cycle bottoming.",
      mf_funds: ["Parag Parikh Flexi", "HDFC Flexi Cap"],
      cleared: true,
    },
    {
      ticker: "SUNPHARMA",
      name: "Sun Pharmaceutical",
      lane: "momentum",
      cmp: 1748.55,
      change_pct: 2.31,
      score: 0.69,
      thesis_short:
        "Five-day move of +7.8% on broad pharma rotation. RSI 64 — still room before overheating.",
      mf_funds: ["SBI Healthcare", "Nippon India Pharma"],
      cleared: true,
    },
    {
      ticker: "HDFCBANK",
      name: "HDFC Bank",
      lane: "smart_money",
      cmp: 1623.80,
      change_pct: 0.18,
      score: 0.58,
      thesis_short:
        "Held by 11 tracked large-cap funds. Sideways base intact; awaits sector breadth confirmation.",
      mf_funds: ["ICICI Pru Bluechip", "Mirae Large Cap", "+9 more"],
      cleared: true,
    },
    {
      ticker: "ITC",
      name: "ITC Limited",
      lane: "value",
      cmp: 412.65,
      change_pct: -0.78,
      score: 0.54,
      thesis_short:
        "12.4% off 52-week high with RSI 38. FMCG sector cold but valuation cushion supports re-rating.",
      mf_funds: ["Kotak Flexi Cap"],
      cleared: true,
    },
    {
      ticker: "TATAPOWER",
      name: "Tata Power",
      lane: "momentum",
      cmp: 418.10,
      change_pct: 3.18,
      score: 0.51,
      thesis_short:
        "Energy lane re-awakening — five consecutive higher lows. Watch ₹430 resistance.",
      mf_funds: [],
      cleared: false,
    },
  ],
  sectors: [
    { name: "Nifty IT", momentum: 0.78, state: "hot" },
    { name: "Nifty Pharma", momentum: 0.62, state: "hot" },
    { name: "Nifty Healthcare", momentum: 0.41, state: "hot" },
    { name: "Nifty Auto", momentum: 0.28, state: "neutral" },
    { name: "Nifty Pvt Bank", momentum: 0.19, state: "neutral" },
    { name: "Nifty Consumer Durables", momentum: 0.11, state: "neutral" },
    { name: "Nifty Financial Svcs", momentum: 0.08, state: "neutral" },
    { name: "Nifty Bank", momentum: 0.04, state: "neutral" },
    { name: "Nifty Energy", momentum: -0.02, state: "neutral" },
    { name: "Nifty Metal", momentum: -0.09, state: "cold" },
    { name: "Nifty FMCG", momentum: -0.14, state: "cold" },
    { name: "Nifty Media", momentum: -0.22, state: "cold" },
    { name: "Nifty PSU Bank", momentum: -0.31, state: "cold" },
    { name: "Nifty Realty", momentum: -0.44, state: "cold" },
  ],
  portfolio: {
    total_invested: 420000,
    current_value: 380000,
    pnl_abs: -40000,
    pnl_pct: -9.52,
    day_pnl_abs: 2840,
    day_pnl_pct: 0.75,
    holdings: [
      { ticker: "RELIANCE", qty: 22, avg: 2480, cmp: 2787.50, pnl_pct: 12.4, action: "HOLD" },
      { ticker: "HDFCBANK", qty: 35, avg: 1574, cmp: 1623.80, pnl_pct: 3.2, action: "HOLD" },
      { ticker: "INFY", qty: 60, avg: 1618, cmp: 1480.20, pnl_pct: -8.6, action: "AVERAGE" },
      { ticker: "ITC", qty: 280, avg: 349, cmp: 412.65, pnl_pct: 18.2, action: "HOLD" },
      { ticker: "TATAPOWER", qty: 110, avg: 436, cmp: 418.10, pnl_pct: -4.1, action: "AVERAGE" },
      { ticker: "TCS", qty: 14, avg: 3540, cmp: 3812.40, pnl_pct: 7.7, action: "HOLD" },
      { ticker: "SUNPHARMA", qty: 28, avg: 1612, cmp: 1748.55, pnl_pct: 8.5, action: "HOLD" },
      { ticker: "ASIANPAINT", qty: 18, avg: 3120, cmp: 2842.10, pnl_pct: -8.9, action: "REVIEW" },
      { ticker: "BAJFINANCE", qty: 6, avg: 7480, cmp: 6918.40, pnl_pct: -7.5, action: "REVIEW" },
    ],
    flagged_for_action: ["INFY", "TATAPOWER"],
    broker_connected: false,
  },
  // Stock detail (kept from v2 for completeness — reused for any ticker click)
  detail_chart: Array.from({ length: 90 }, (_, i) => {
    // Synthetic OHLC-ish series — purely for the sparkline / chart on detail
    const base = 4500;
    const drift = i * 4;
    const noise = Math.sin(i / 6) * 80 + Math.cos(i / 11) * 50 + (Math.random() - 0.5) * 40;
    return { day: i, value: Math.round(base + drift + noise) };
  }),
};

window.LANE_META = {
  strong: { label: "Strong", color: "#22D3A4", desc: "Clean entry — all 4 conditions met" },
  momentum: { label: "Momentum", color: "#7DD3FC", desc: "Already in motion" },
  value: { label: "Value", color: "#FBBF24", desc: "Oversold contrarian" },
  smart_money: { label: "Smart Money", color: "#A78BFA", desc: "Held by tracked MFs + sane technicals" },
};

window.fmtINR = (n, opts = {}) => {
  const { decimals = 2, sign = false } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  let body;
  if (abs >= 1e7) body = (abs / 1e7).toFixed(2) + " Cr";
  else if (abs >= 1e5) body = (abs / 1e5).toFixed(2) + " L";
  else body = abs.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = sign ? (n < 0 ? "−" : "+") : (n < 0 ? "−" : "");
  return prefix + "₹" + body;
};

window.fmtPct = (n, opts = {}) => {
  const { decimals = 2 } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + Math.abs(n).toFixed(decimals) + "%";
};
