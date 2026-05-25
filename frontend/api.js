// Tilt API client — fetch wrapper for the 11 FastAPI endpoints + adapters
// that map backend payloads into the v2 frontend's TiltV2 shape.
//
// Toggle live mode by setting `window.TILT_API_BASE` before any other script
// loads (index.html does this). When unset, the frontend renders empty-state
// rather than fabricated mock data.

(function () {
  const BASE = window.TILT_API_BASE || "";

  async function get(path) {
    if (!BASE) throw new Error("TILT_API_BASE not set");
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
  }

  async function post(path) {
    if (!BASE) throw new Error("TILT_API_BASE not set");
    const res = await fetch(BASE + path, { method: "POST" });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return res.json();
  }

  const TiltAPI = {
    base: () => BASE,
    isLive: () => Boolean(BASE),

    // 11 backend endpoints + the new /scan/recommendations
    health: () => get("/health"),
    refresh: () => post("/refresh"),
    scanRally: (limit = 20) => get(`/scan/rally?limit=${limit}`),
    scanRallyConviction: () => get("/scan/rally/conviction"),
    scanRallyBySector: () => get("/scan/rally/by-sector"),
    scanAveraging: () => get("/scan/averaging"),
    scanTraps: () => get("/scan/traps"),
    scanRecommendations: () => get("/scan/recommendations"),
    sectorsHeatmap: () => get("/sectors/heatmap"),
    portfolio: () => get("/portfolio"),
    backtestRally: (start, end) => post(`/backtest/rally?start=${start}&end=${end}`),
    stock: (ticker) => get(`/stock/${encodeURIComponent(ticker)}`),
  };

  // --- Adapters: API shape → TiltV2 shape -----------------------------------

  // Sector tile from /sectors/heatmap → frontend SECTORS row
  function adaptSector(tile) {
    return {
      id: tile.sector_name,
      name: tile.display_name,
      momentum: tile.momentum,
      state: tile.tag.toLowerCase(), // Hot|Neutral|Cold → hot|neutral|cold
      count: tile.passing_count,
      index: 0, // sector-level index value not currently surfaced by API
      change: 0,
    };
  }

  // RecommendationCard from /scan/recommendations → frontend STOCK card
  function adaptRecommendation(card) {
    return {
      ticker: card.ticker,
      name: card.name,
      sector: card.sector,
      sectorId: card.sector_id,
      cmp: card.cmp,
      change: 0, // not in current API payload
      rsi: card.indicators.rsi,
      macd: card.indicators.macd_hist,
      ema20: card.indicators.ema20,
      gap52: -(card.indicators.pct_below_52w_high * 100),
      score: card.score,
      scoreParts: {
        momentum: card.score_breakdown.momentum,
        upside: card.score_breakdown.upside,
        rsi: card.score_breakdown.rsi,
        sector: card.score_breakdown.sector,
      },
      lane: card.lane, // 'strong' | 'momentum' | 'value'
      pros: card.pros,
      cons: card.cons,
    };
  }

  // PortfolioHolding from /portfolio → frontend HOLDINGS row
  function adaptHolding(h) {
    return {
      ticker: h.ticker,
      qty: h.quantity,
      avgBuy: h.avg_buy_price,
      cmp: h.cmp,
      change: 0,
      status: h.status.toLowerCase(), // Hold|Average|Sell → hold|average|sell
      reason: h.reason,
      sectorId: h.sector,
    };
  }

  // Compose the TiltV2 market payload. LANES + MUTUAL_FUNDS already in data.jsx
  // so we don't return them here — caller merges.
  async function fetchTiltV2() {
    const [heatmap, recs, portfolio] = await Promise.all([
      TiltAPI.sectorsHeatmap(),
      TiltAPI.scanRecommendations(),
      TiltAPI.portfolio(),
    ]);
    return {
      SECTORS: heatmap.sectors.map(adaptSector),
      STOCKS: recs.cards.map(adaptRecommendation),
      HOLDINGS: portfolio.holdings.map(adaptHolding),
      STOCK_OHLC: [], // fetched lazily by stock-detail screen
      _counts: recs.counts, // useful for the hero subtitle
    };
  }

  TiltAPI.fetchTiltV2 = fetchTiltV2;
  TiltAPI.adapters = { adaptSector, adaptRecommendation, adaptHolding };

  window.TiltAPI = TiltAPI;
})();
