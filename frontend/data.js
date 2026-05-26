// Tilt v3 — LIVE API client + adapter.
// Fetches /scan/brief and /portfolio from the FastAPI backend and shapes the
// response into the window.TILT_DATA contract the UI components consume.
// No mock fallback: if API is unreachable, an error banner surfaces.

(function () {
  const BASE = window.TILT_API_BASE || "";

  window.LANE_META = {
    strong:      { label: "Strong",      color: "#22D3A4", desc: "Clean entry — all 4 conditions met" },
    momentum:    { label: "Momentum",    color: "#7DD3FC", desc: "Already in motion" },
    value:       { label: "Value",       color: "#FBBF24", desc: "Oversold contrarian" },
    smart_money: { label: "Smart Money", color: "#A78BFA", desc: "Held by tracked MFs + sane technicals" },
  };

  window.fmtINR = (n, opts = {}) => {
    const { decimals = 2, sign = false } = opts;
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    let body;
    if (abs >= 1e7) body = (abs / 1e7).toFixed(2) + " Cr";
    else if (abs >= 1e5) body = (abs / 1e5).toFixed(2) + " L";
    else
      body = abs.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    const prefix = sign ? (n < 0 ? "−" : "+") : n < 0 ? "−" : "";
    return prefix + "₹" + body;
  };

  window.fmtPct = (n, opts = {}) => {
    const { decimals = 2 } = opts;
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + Math.abs(n).toFixed(decimals) + "%";
  };

  function adaptHero(card) {
    if (!card) return null;
    const ema20 = card.indicators?.ema20 || 0;
    const ema20DistPct = ema20 ? ((card.cmp - ema20) / ema20) * 100 : 0;
    return {
      ticker: card.ticker,
      name: card.name,
      lane: card.lane,
      cmp: card.cmp,
      change_pct: 0,
      change_abs: 0,
      score: card.score,
      thesis: card.thesis || "",
      why_this: card.why_this || "",
      indicators: {
        rsi: card.indicators?.rsi,
        macd_days_positive: null,
        ema20_distance_pct: ema20DistPct,
        week52_high_distance_pct: -((card.indicators?.pct_below_52w_high || 0) * 100),
        volume_vs_30d_pct: null,
        sector_state: (card.sector_tag || "neutral").toLowerCase(),
      },
      score_breakdown: card.score_breakdown,
      pros: card.pros || [],
      cons: card.cons || [],
      mf_context: card.mf_context
        ? {
            held_by_count: card.mf_context.funds_count,
            funds: card.mf_context.fund_short_names || [],
          }
        : null,
      fund_blurbs: card.fund_blurbs || null,
      projections: card.projections || null,
    };
  }

  function adaptSupporting(card) {
    return {
      ticker: card.ticker,
      name: card.name,
      lane: card.lane,
      cmp: card.cmp,
      change_pct: 0,
      score: card.score,
      thesis_short: card.thesis_short || "",
      mf_funds: card.mf_context?.fund_short_names || [],
      cleared: true,
      fund_blurbs: card.fund_blurbs || null,
      projections: card.projections || null,
    };
  }

  function adaptSectors(sectors) {
    return (sectors || []).map((s) => ({
      name: s.name,
      momentum: s.momentum,
      state: s.state || "neutral",
    }));
  }

  function adaptPortfolio(resp) {
    const holdings = (resp.holdings || []).map((h) => ({
      ticker: h.ticker,
      qty: h.quantity,
      avg: h.avg_buy_price,
      cmp: h.cmp,
      pnl_pct: h.pnl_pct,
      action: (h.status || "HOLD").toUpperCase(),
    }));
    const currentValue = holdings.reduce((acc, h) => acc + h.cmp * h.qty, 0);
    const pnlAbs = currentValue - (resp.total_invested || 0);
    const pnlPct = resp.total_invested ? (pnlAbs / resp.total_invested) * 100 : 0;
    return {
      total_invested: resp.total_invested || 0,
      current_value: currentValue,
      pnl_abs: pnlAbs,
      pnl_pct: pnlPct,
      day_pnl_abs: 0,
      day_pnl_pct: 0,
      holdings,
      flagged_for_action: holdings.filter((h) => h.action !== "HOLD").map((h) => h.ticker),
      broker_connected: false,
    };
  }

  const EMPTY = {
    snapshot_date: "—",
    market_read: "",
    scan_stats: { tickers_scanned: 0, total_picks: 0, lane_counts: {} },
    hero: null,
    supporting: [],
    sectors: [],
    portfolio: {
      total_invested: 0, current_value: 0, pnl_abs: 0, pnl_pct: 0,
      day_pnl_abs: 0, day_pnl_pct: 0,
      holdings: [], flagged_for_action: [], broker_connected: false,
    },
    llm_provider: "—",
    data_mode: "—",
    error: null,
  };

  async function fetchTiltData() {
    if (!BASE) return { ...EMPTY, error: "TILT_API_BASE not configured" };
    try {
      const [briefRes, portfolioRes] = await Promise.all([
        fetch(BASE + "/scan/brief"),
        fetch(BASE + "/portfolio"),
      ]);
      if (!briefRes.ok) throw new Error(`brief: ${briefRes.status}`);
      if (!portfolioRes.ok) throw new Error(`portfolio: ${portfolioRes.status}`);
      const brief = await briefRes.json();
      const portfolio = await portfolioRes.json();
      return {
        snapshot_date: brief.snapshot_date,
        market_read: brief.market_read,
        scan_stats: brief.scan_stats,
        hero: adaptHero(brief.hero),
        supporting: (brief.supporting || []).map(adaptSupporting),
        sectors: adaptSectors(brief.sectors),
        portfolio: adaptPortfolio(portfolio),
        llm_provider: brief.llm_provider,
        data_mode: brief.data_mode,
        error: null,
      };
    } catch (e) {
      console.error("API fetch failed:", e);
      return { ...EMPTY, error: String(e.message || e) };
    }
  }

  window.TILT_API = { fetchTiltData, BASE };
  window.TILT_DATA = EMPTY;
})();
