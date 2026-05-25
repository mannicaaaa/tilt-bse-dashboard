// Main App — composes the daily brief.
// Fetches live data from the API (via window.TILT_API.fetchTiltData) on mount,
// shows a loading state, surfaces API errors transparently.
const App = () => {
  const {
    TopNav,
    MarketRead,
    HeroPick,
    SupportingPickRow,
    SectorStrip,
    PortfolioSidebar,
    StockDetail,
  } = window;

  const [data, setData] = React.useState(window.TILT_DATA);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [openTicker, setOpenTicker] = React.useState(null);
  const [selectedSector, setSelectedSector] = React.useState(null);

  const [t, setTweak] = window.useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "dark",
    "density": "comfortable",
    "showSidebar": true
  }/*EDITMODE-END*/);

  const dark = t.theme === "dark";

  // Filter supporting picks by sector when a sector is selected.
  // We match on sector_id when available; fall back to substring match on name.
  const filteredSupporting = selectedSector
    ? (data.supporting || []).filter((p) =>
        (p.sector_id && p.sector_id === selectedSector) ||
        (p.sector && selectedSector && p.sector.includes(selectedSector))
      )
    : data.supporting || [];

  // Load on mount + on refresh
  const reload = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await window.TILT_API.fetchTiltData();
      setData(fresh);
      window.TILT_DATA = fresh;
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    document.body.classList.toggle("light", !dark);
  }, [dark]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--fg-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          letterSpacing: 0.5,
        }}
      >
        Loading today's brief…
      </div>
    );
  }

  return (
    <div data-screen-label="01 Daily Brief" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopNav
        snapshotDate={data.snapshot_date}
        dark={dark}
        onToggleTheme={() => setTweak("theme", dark ? "light" : "dark")}
        onRefresh={reload}
        refreshing={refreshing}
        llmProvider={data.llm_provider}
        dataMode={data.data_mode}
      />

      {data.error && (
        <div
          style={{
            maxWidth: 1320,
            margin: "12px auto 0",
            padding: "10px 14px",
            border: "1px solid rgba(248,113,113,0.4)",
            background: "rgba(248,113,113,0.08)",
            color: "#FCA5A5",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          API error: {data.error}. Showing fallback view. Hit Refresh to retry.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: t.showSidebar ? "minmax(0, 1fr) 320px" : "minmax(0, 1fr)",
          gap: 32,
          maxWidth: 1320,
          margin: "0 auto",
          padding: "32px 32px 64px",
        }}
      >
        {/* MAIN COLUMN */}
        <main style={{ minWidth: 0 }}>
          <MarketRead data={data} />

          {data.hero ? (
            <HeroPick pick={data.hero} onOpenDetail={(t) => setOpenTicker(t)} />
          ) : (
            <section
              style={{
                background: "var(--bg-card)",
                border: "1px dashed var(--border)",
                borderRadius: 16,
                padding: 32,
                marginBottom: 36,
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              No conviction pick today — none of the {data.scan_stats?.tickers_scanned || "—"} scanned tickers cleared the lane filters.
            </section>
          )}

          {/* Supporting picks list */}
          <section style={{ marginBottom: 36 }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                  margin: 0,
                }}
              >
                Supporting Picks
                <span style={{ color: "var(--fg-faint)", marginLeft: 10 }}>
                  {filteredSupporting.length} of {(data.supporting || []).length}
                </span>
              </h2>
              {selectedSector && (
                <button
                  onClick={() => setSelectedSector(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--fg-muted)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear filter · {selectedSector}
                </button>
              )}
            </header>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredSupporting.length === 0 && (
                <div
                  style={{
                    padding: "32px 24px",
                    border: "1px dashed var(--border)",
                    borderRadius: 12,
                    color: "var(--fg-faint)",
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  No supporting picks in this sector today.
                </div>
              )}
              {filteredSupporting.map((p) => (
                <SupportingPickRow key={p.ticker} pick={p} onOpen={(t) => setOpenTicker(t)} />
              ))}
            </div>
          </section>

          <SectorStrip
            sectors={data.sectors || []}
            selectedSector={selectedSector}
            onSelect={setSelectedSector}
          />
        </main>

        {/* RIGHT SIDEBAR */}
        {t.showSidebar && data.portfolio && (
          <PortfolioSidebar data={data.portfolio} onOpenStock={(t) => setOpenTicker(t)} />
        )}
      </div>

      {/* Detail overlay */}
      {openTicker && (
        <StockDetail ticker={openTicker} allData={data} onClose={() => setOpenTicker(null)} />
      )}

      {/* Tweaks panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel>
          <window.TweakSection label="Theme" />
          <window.TweakRadio
            label="Mode"
            value={t.theme}
            options={["dark", "light"]}
            onChange={(v) => setTweak("theme", v)}
          />
          <window.TweakSection label="Layout" />
          <window.TweakToggle
            label="Portfolio sidebar"
            value={t.showSidebar}
            onChange={(v) => setTweak("showSidebar", v)}
          />
          <window.TweakRadio
            label="Density"
            value={t.density}
            options={["comfortable", "compact"]}
            onChange={(v) => setTweak("density", v)}
          />
        </window.TweaksPanel>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
