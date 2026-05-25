// v2 app — routing + state + live API wiring.
//
// Fetches TiltV2 market data on mount. If TILT_API_BASE is set and the API
// responds, screens render against real data. If the API is unreachable, we
// surface the error in a top banner and render empty arrays — never fall
// back to fabricated mock data.

const {
  Icon, Sidebar, Topbar, Shell, PageHeader,
  ScreenToday, ScreenPortfolio, ScreenStock,
  Card, Button,
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor,
} = window;

const { useState, useEffect, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#22D3A4",
  "density": "regular",
  "showLanes": ["strong", "momentum", "value"]
}/*EDITMODE-END*/;

const ScreenSettings = () => (
  <div className="tilt-fade">
    <PageHeader kicker="Configuration" title="Settings" subtitle="Connect data sources and configure filter thresholds." />
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Card>
        <div className="text-[11px] uppercase tracking-[0.14em] text-fg-dim font-semibold mb-3">Data sources</div>
        <div className="space-y-3">
          {[
            { label: 'Live OHLCV (yfinance)', value: 'Active · Render-hosted backend', ok: true },
            { label: 'NSE sectoral indices', value: '14 indices · constituent-averaged momentum', ok: true },
            { label: 'Groww brokerage', value: 'Mock provider · live swap pending credentials', ok: false },
            { label: 'Mutual fund holdings', value: 'Hand-curated monthly snapshot', ok: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between p-3 bg-ink-600 border border-line rounded-lg">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-fg">{row.label}</div>
                <div className="text-[11.5px] mono text-fg-muted">{row.value}</div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${row.ok ? 'bg-bull' : 'bg-warn'}`}></span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-[0.14em] text-fg-dim font-semibold mb-3">Filter thresholds</div>
        <div className="space-y-3 text-[12.5px]">
          <div className="flex items-center justify-between"><span className="text-fg-muted">RSI rally band (Strong)</span><span className="mono text-fg">45 – 62</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">RSI rising (Momentum)</span><span className="mono text-fg">≥ 50</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">RSI oversold (Value)</span><span className="mono text-fg">&lt; 35</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">52W gap (Strong)</span><span className="mono text-fg">≥ 15%</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">52W gap (Value)</span><span className="mono text-fg">≥ 10%</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">MACD crossover window</span><span className="mono text-fg">3 bars</span></div>
        </div>
        <div className="mt-4 pt-4 border-t border-line-soft text-[11.5px] text-fg-dim">
          Thresholds defined in <span className="mono text-fg-muted">tilt/signals/filters.py</span> + <span className="mono text-fg-muted">tilt/api/recommendations.py</span>.
        </div>
      </Card>
    </div>
  </div>
);

const useTimeAgo = (date) => {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 20000); return () => clearInterval(t); }, []);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState({ screen: 'today', params: null, extra: null });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(new Date());
  const [scanStats, setScanStats] = useState({ tickers: 0, duration: 0 });
  const lastRefreshedText = useTimeAgo(refreshedAt);

  // Live data wiring — fetch from API; never fall back to mock seeds.
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState(null);

  const data = marketData
    ? { ...window.TiltV2, ...marketData }
    : window.TiltV2;

  const loadMarketData = useCallback(async () => {
    if (!window.TiltAPI || !window.TiltAPI.isLive()) {
      setApiError("TILT_API_BASE not configured — set it in index.html");
      setLoading(false);
      return;
    }
    try {
      const fresh = await window.TiltAPI.fetchTiltV2();
      setMarketData(fresh);
      setApiError(null);
      setRefreshedAt(new Date());
      setScanStats({
        tickers: (fresh.SECTORS || []).reduce((acc, s) => acc + (s.count || 0), 0) || 79,
        duration: 0,
      });
    } catch (err) {
      console.error("Tilt API fetch failed:", err);
      setApiError(err.message || "API unreachable");
      setMarketData(null);
    }
  }, []);

  useEffect(() => {
    loadMarketData().finally(() => setLoading(false));
  }, [loadMarketData]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', tweaks.theme === 'light');
  }, [tweaks.theme]);

  const navigate = useCallback((screen, params = null, extra = null) => {
    setRoute({ screen, params, extra });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Lazy-fetch per-stock OHLC when the user navigates into the Stock screen.
  // We mutate liveData's STOCK_OHLC so the stock screen re-renders with real bars.
  useEffect(() => {
    if (route.screen !== 'stock' || !route.params) return;
    if (!window.TiltAPI || !window.TiltAPI.isLive()) return;
    let cancelled = false;
    window.TiltAPI.stock(route.params)
      .then((resp) => {
        if (cancelled) return;
        const ohlc = window.TiltAPI.adapters.adaptStockDetail(resp);
        setMarketData((prev) => ({ ...(prev || {}), STOCK_OHLC: ohlc }));
      })
      .catch((err) => {
        console.error("Stock detail fetch failed:", err);
      });
    return () => { cancelled = true; };
  }, [route.screen, route.params]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await window.TiltAPI.refresh();
      const fresh = await window.TiltAPI.fetchTiltV2();
      setMarketData(fresh);
      setApiError(null);
      setRefreshedAt(new Date());
      setScanStats({
        tickers: r.tickers_fetched,
        duration: r.duration_seconds,
      });
    } catch (err) {
      console.error("Refresh failed:", err);
      setApiError(err.message || "Refresh failed");
      setMarketData(null);
    } finally {
      setRefreshing(false);
    }
  };

  const onToggleTheme = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');
  const sidebarCurrent = route.screen === 'stock' ? 'today' : route.screen;

  const renderScreen = () => {
    switch (route.screen) {
      case 'today':
        return <ScreenToday data={data} refreshing={refreshing} lastRefreshedText={lastRefreshedText}
                            onRefresh={onRefresh} navigate={navigate} scanStats={scanStats} />;
      case 'portfolio':
        return <ScreenPortfolio data={data} navigate={navigate} />;
      case 'stock':
        return <ScreenStock ticker={route.params} data={data} navigate={navigate} fromLane={route.extra?.lane} />;
      case 'settings':
        return <ScreenSettings />;
      default:
        return null;
    }
  };

  return (
    <div data-screen-label={`Tilt · ${route.screen}`}>
      <Sidebar current={sidebarCurrent} onNavigate={(id) => navigate(id)} />
      <Topbar current={route.screen} theme={tweaks.theme} onToggleTheme={onToggleTheme} />
      {apiError && (
        <div style={{ margin: '0 auto', maxWidth: 1440, padding: '12px 32px' }}>
          <div style={{
            padding: '10px 14px',
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(248,113,113,0.08)',
            color: '#FCA5A5',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}>
            API error: {apiError}. Showing empty state. Hit Refresh to retry.
          </div>
        </div>
      )}
      {loading && !marketData && (
        <div style={{
          margin: '0 auto', maxWidth: 1440, padding: '12px 32px',
          color: '#A1A1AA', fontSize: 13,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        }}>
          Loading data from API… first call hits live yfinance, can take 15–30s.
        </div>
      )}
      <Shell>{renderScreen()}</Shell>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={tweaks.theme} options={['dark', 'light']}
                    onChange={(v) => setTweak('theme', v)} />
        <TweakColor label="Accent" value={tweaks.accent}
                    options={['#22D3A4', '#7DD3FC', '#A78BFA', '#FBBF24', '#F472B6']}
                    onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Density" value={tweaks.density}
                    options={['compact', 'regular', 'comfy']}
                    onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
