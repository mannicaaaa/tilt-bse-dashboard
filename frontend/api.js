// Tilt API client — thin fetch wrapper for the 11 FastAPI endpoints.
//
// Toggle live mode by setting `window.TILT_API_BASE` before app.jsx loads:
//
//   <script>window.TILT_API_BASE = "https://tilt-api.onrender.com";</script>
//
// When unset, the frontend continues using the seed data in data.jsx so the
// design is always demoable offline. `TiltAPI.isLive()` lets screens branch
// at render time if they want to show a "Live data" indicator.

(function () {
  const DEFAULT_BASE = window.TILT_API_BASE || "";

  async function get(path, opts = {}) {
    if (!DEFAULT_BASE) {
      throw new Error("TILT_API_BASE not set — frontend running in mock mode");
    }
    const url = DEFAULT_BASE + path;
    const res = await fetch(url, opts);
    if (!res.ok) {
      throw new Error(`GET ${path} → ${res.status}`);
    }
    return res.json();
  }

  async function post(path, body) {
    if (!DEFAULT_BASE) {
      throw new Error("TILT_API_BASE not set — frontend running in mock mode");
    }
    const res = await fetch(DEFAULT_BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`POST ${path} → ${res.status}`);
    }
    return res.json();
  }

  // --- 11 endpoints, one method each ----------------------------------------

  const TiltAPI = {
    base: () => DEFAULT_BASE,
    isLive: () => Boolean(DEFAULT_BASE),

    // Health + refresh
    health: () => get("/health"),
    refresh: () => post("/refresh"),

    // Scans
    scanRally: (limit = 20) => get(`/scan/rally?limit=${limit}`),
    scanRallyConviction: () => get("/scan/rally/conviction"),
    scanRallyBySector: () => get("/scan/rally/by-sector"),
    scanAveraging: () => get("/scan/averaging"),
    scanTraps: () => get("/scan/traps"),

    // Sectors + portfolio
    sectorsHeatmap: () => get("/sectors/heatmap"),
    portfolio: () => get("/portfolio"),

    // Backtest + stock detail
    backtestRally: (start, end) => post(`/backtest/rally?start=${start}&end=${end}`),
    stock: (ticker) => get(`/stock/${encodeURIComponent(ticker)}`),
  };

  // --- Adapters: API shape → frontend data.jsx shape ------------------------
  //
  // The frontend was built against TiltData = { SECTORS, STOCKS, HOLDINGS, ... }
  // The API returns a slightly different shape. These adapters bridge them so
  // screens don't need to know whether they're rendering mock or live data.

  function adaptSector(tile) {
    return {
      id: tile.sector_name,
      name: tile.display_name,
      momentum: tile.momentum,
      state: tile.tag.toLowerCase(), // "Hot" → "hot"
      count: tile.passing_count,
      index: 0, // API doesn't track sectoral index value directly
      change: 0,
    };
  }

  function adaptScanResult(row) {
    return {
      ticker: row.ticker,
      name: row.name,
      sector: row.sector,
      sectorId: row.sector,
      cmp: row.cmp,
      change: 0,
      rsi: row.indicators.rsi,
      macd: row.indicators.macd_hist,
      ema20: row.indicators.ema20,
      gap52: -row.indicators.pct_below_52w_high * 100,
      score: row.score,
      scoreParts: {
        momentum: row.score_breakdown.momentum,
        upside: row.score_breakdown.upside,
        rsi: row.score_breakdown.rsi,
        sector: row.score_breakdown.sector,
      },
      filterTriggers: row.filter_triggers,
    };
  }

  function adaptHolding(h) {
    return {
      ticker: h.ticker,
      name: h.name,
      qty: h.quantity,
      avgBuy: h.avg_buy_price,
      cmp: h.cmp,
      pnl: h.pnl_abs,
      pnlPct: h.pnl_pct,
      status: h.status, // already Hold/Average/Sell
      reason: h.reason,
      sector: h.sector,
      sectorState: h.sector_tag.toLowerCase(),
    };
  }

  // Compose a live-mode TiltData payload by fanning out the relevant endpoints
  // in parallel. Returns an object with the same fields the screens expect.
  async function fetchTiltData() {
    const [heatmap, conviction, portfolio] = await Promise.all([
      TiltAPI.sectorsHeatmap(),
      TiltAPI.scanRallyConviction(),
      TiltAPI.portfolio(),
    ]);
    return {
      SECTORS: heatmap.sectors.map(adaptSector),
      STOCKS: conviction.results.map(adaptScanResult),
      HOLDINGS: portfolio.holdings.map(adaptHolding),
      // STOCK_OHLC / BACKTEST_* fetched lazily by the screens that need them
      STOCK_OHLC: null,
      BACKTEST: null,
      BACKTEST_SIGNALS: null,
      BACKTEST_CURVE: null,
    };
  }

  TiltAPI.fetchTiltData = fetchTiltData;
  TiltAPI.adapters = { adaptSector, adaptScanResult, adaptHolding };

  window.TiltAPI = TiltAPI;
})();
