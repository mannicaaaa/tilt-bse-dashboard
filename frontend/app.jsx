// Main app — routing + state + tweaks

const {
  Icon, Sidebar, Topbar, Shell, PageHeader, SectionLabel,
  ScreenDashboard, ScreenPortfolio, ScreenScan, ScreenStock, ScreenBacktest,
  TiltData, Card, Button, EmptyState,
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakColor, TweakSlider,
} = window;

const { useState, useEffect, useCallback, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#22D3A4",
  "density": "regular",
  "monoEverything": true,
  "showLiveDot": true
}/*EDITMODE-END*/;

// ---- Settings placeholder ----
const ScreenSettings = () => (
  <div className="tilt-fade">
    <PageHeader
      kicker="Configuration"
      title="Settings"
      subtitle="Connect data sources, configure filter thresholds, and manage the Tilt scanner."
    />
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <Card>
        <SectionLabel>Data sources</SectionLabel>
        <div className="space-y-3">
          {[
            { label: 'Groww brokerage', value: 'Connected · last sync 2 min ago', ok: true },
            { label: 'NSE feed (sectoral)', value: 'Connected · 14 indices', ok: true },
            { label: 'Bhavcopy archive', value: '252 sessions cached', ok: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between p-3 bg-ink-600 border border-line rounded-lg">
              <div>
                <div className="text-[13px] font-medium text-fg">{row.label}</div>
                <div className="text-[11.5px] mono text-fg-muted">{row.value}</div>
              </div>
              <span className={`w-2 h-2 rounded-full ${row.ok ? 'bg-bull' : 'bg-bear'}`}></span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionLabel>Filter thresholds</SectionLabel>
        <div className="space-y-3 text-[12.5px]">
          <div className="flex items-center justify-between"><span className="text-fg-muted">RSI rally band</span><span className="mono text-fg">45 – 62</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">52W gap range</span><span className="mono text-fg">−10% to −4%</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">MACD threshold</span><span className="mono text-fg">&gt; 0.00</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">Scan window</span><span className="mono text-fg">60 days</span></div>
          <div className="flex items-center justify-between"><span className="text-fg-muted">Hold period (backtest)</span><span className="mono text-fg">30 days</span></div>
        </div>
        <div className="mt-4 pt-4 border-t border-line-soft text-[11.5px] text-fg-dim">
          Thresholds defined in <span className="mono text-fg-muted">filters.yaml</span> on the backend. Edit there and refresh.
        </div>
      </Card>
    </div>
    <div className="mt-8 p-6 border border-dashed border-line-strong rounded-card text-center">
      <EmptyState
        icon={<Icon.Settings size={22} />}
        title="More settings coming"
        body="Watchlist management, alert webhooks, and indicator weight tuning will live here."
      />
    </div>
  </div>
);

// Format time ago
const useTimeAgo = (date) => {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [route, setRoute] = useState({ screen: 'dashboard', params: null, extra: null });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(new Date(Date.now() - 2 * 60 * 1000));
  const [refreshStats, setRefreshStats] = useState({ duration: 3.2, tickers: 47, cacheHits: 12 });
  const lastRefreshed = useTimeAgo(refreshedAt);

  // --- Live data wiring ---
  // If TILT_API_BASE is set, fetch live on mount. Otherwise fall back to
  // the hand-tuned seed data in data.jsx so the dashboard always renders.
  const [liveData, setLiveData] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (!window.TiltAPI || !window.TiltAPI.isLive()) {
      // Mock mode — use seed data directly.
      setLiveData(window.TiltData);
      return;
    }
    let cancelled = false;
    window.TiltAPI.fetchTiltData()
      .then((data) => {
        if (cancelled) return;
        // Merge: API-derived fields win; missing fields (STOCK_OHLC, BACKTEST_*)
        // fall back to seed data so sub-screens that aren't lazy-wired yet still
        // render rather than crash.
        setLiveData({ ...window.TiltData, ...data });
        setRefreshedAt(new Date());
      })
      .catch((err) => {
        console.error('Tilt API initial fetch failed; using mock seed:', err);
        if (cancelled) return;
        setLiveData(window.TiltData);
        setApiError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  const data = liveData || window.TiltData;

  // Theme management
  useEffect(() => {
    const html = document.documentElement;
    if (tweaks.theme === 'light') html.classList.add('light');
    else html.classList.remove('light');
  }, [tweaks.theme]);

  // Accent color as CSS variable (override Tailwind bull where used as accent)
  useEffect(() => {
    document.documentElement.style.setProperty('--tilt-accent', tweaks.accent);
  }, [tweaks.accent]);

  const navigate = useCallback((screen, params = null, extra = null) => {
    setRoute({ screen, params, extra });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (window.TiltAPI && window.TiltAPI.isLive()) {
        // Real refresh: POST /refresh, then re-fetch the dashboard payload.
        const refreshResp = await window.TiltAPI.refresh();
        const fresh = await window.TiltAPI.fetchTiltData();
        setLiveData({ ...window.TiltData, ...fresh });
        setRefreshedAt(new Date());
        setRefreshStats({
          duration: refreshResp.duration_seconds,
          tickers: refreshResp.tickers_fetched,
          cacheHits: refreshResp.cache_hits,
        });
        setApiError(null);
      } else {
        // Mock refresh — simulate latency for the UI animation.
        await new Promise((r) => setTimeout(r, 1100));
        setRefreshedAt(new Date());
        setRefreshStats({
          duration: (2.4 + Math.random() * 2.4).toFixed(1) * 1,
          tickers: 47,
          cacheHits: Math.floor(8 + Math.random() * 12),
        });
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      setApiError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onToggleTheme = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');

  // Currently active sidebar item (stock detail keeps Scan highlighted)
  const sidebarCurrent = route.screen === 'stock' ? 'scan' : route.screen;

  // Map nav -> screen. `data` is liveData when API is reachable, mock otherwise.
  const renderScreen = () => {
    switch (route.screen) {
      case 'dashboard':
        return <ScreenDashboard data={data} refreshing={refreshing} lastRefreshed={lastRefreshed}
          onRefresh={onRefresh} navigate={navigate} refreshStats={refreshStats} />;
      case 'portfolio':
        return <ScreenPortfolio data={data} navigate={navigate} initialTab={route.extra?.tab || 'all'} />;
      case 'scan':
        return <ScreenScan data={data} navigate={navigate} initialFilter={route.extra?.sectorFilter || 'all'} />;
      case 'stock':
        return <ScreenStock ticker={route.params} data={data} navigate={navigate} />;
      case 'backtest':
        return <ScreenBacktest data={data} navigate={navigate} />;
      case 'settings':
        return <ScreenSettings />;
      default:
        return null;
    }
  };

  return (
    <div data-screen-label={`Tilt · ${route.screen}`}>
      <Sidebar current={sidebarCurrent} onNavigate={(id) => navigate(id)} />
      <Topbar
        current={route.screen}
        lastRefreshed={lastRefreshed}
        refreshing={refreshing}
        onRefresh={onRefresh}
        theme={tweaks.theme}
        onToggleTheme={onToggleTheme}
      />
      <Shell>{renderScreen()}</Shell>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio
          label="Theme"
          value={tweaks.theme}
          options={['dark', 'light']}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakColor
          label="Accent"
          value={tweaks.accent}
          options={['#22D3A4', '#7DD3FC', '#A78BFA', '#FBBF24', '#F472B6']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakSection label="Detail" />
        <TweakToggle
          label="Live indicator"
          value={tweaks.showLiveDot}
          onChange={(v) => setTweak('showLiveDot', v)}
        />
        <TweakToggle
          label="Mono for all numerics"
          value={tweaks.monoEverything}
          onChange={(v) => setTweak('monoEverything', v)}
        />
      </TweaksPanel>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
