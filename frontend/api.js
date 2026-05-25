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
  //
  // We fetch the FULL /scan/rally (limit 200) so the Scan screen has a
  // complete list, and the Dashboard's `score >= 0.8` filter naturally picks
  // the conviction subset. Backtest + per-stock OHLC are fetched lazily by
  // their respective screens — too expensive to load up front.
  async function fetchTiltData() {
    const [heatmap, rallyAll, portfolio] = await Promise.all([
      TiltAPI.sectorsHeatmap(),
      TiltAPI.scanRally(200),
      TiltAPI.portfolio(),
    ]);
    return {
      SECTORS: heatmap.sectors.map(adaptSector),
      STOCKS: rallyAll.results.map(adaptScanResult),
      HOLDINGS: portfolio.holdings.map(adaptHolding),
      // Sub-screen data (lazy):
      STOCK_OHLC: null,
      BACKTEST: null,
      BACKTEST_SIGNALS: null,
      BACKTEST_CURVE: null,
    };
  }

  // Adapter for a single stock-detail response — used by the Stock screen.
  function adaptStockDetail(resp) {
    const ohlc = (resp.ohlcv || []).map((bar) => ({
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
    return {
      ticker: resp.ticker,
      name: resp.name,
      cmp: resp.cmp,
      sector: resp.sector,
      sectorState: (resp.sector_tag || "").toLowerCase(),
      ohlc,
      indicatorSeries: resp.indicator_series,
    };
  }

  // Adapter for /backtest/rally response → frontend BACKTEST shape.
  function adaptBacktest(resp) {
    return {
      BACKTEST: {
        lastRun: new Date().toISOString().slice(0, 10),
        duration: 0,
        triggers: resp.metrics.triggers,
        hitRate: resp.metrics.hit_rate_30d,
        avgReturn: resp.metrics.avg_fwd_return_30d,
        maxDD: resp.metrics.max_drawdown_per_signal,
      },
      // Per-signal events + cumulative curve aren't returned by the current
      // /backtest endpoint — the engine has them in memory but doesn't expose
      // them. Sub-screen falls back to mock for these until the endpoint is
      // extended in a follow-up.
      BACKTEST_SIGNALS: null,
      BACKTEST_CURVE: null,
    };
  }

  TiltAPI.fetchTiltData = fetchTiltData;
  TiltAPI.adapters = { adaptSector, adaptScanResult, adaptHolding, adaptStockDetail, adaptBacktest };

  window.TiltAPI = TiltAPI;
})();
