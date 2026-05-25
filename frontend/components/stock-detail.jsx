// Stock Detail — full-screen overlay view. Carried over from v2 (real chart + indicators panel).
const StockDetail = ({ ticker, allData, onClose }) => {
  const { fmtINR, fmtPct, LaneTag, Icon } = window;

  // Resolve the stock — could be the hero, a supporting pick, or a portfolio holding.
  let stock = null;
  if (allData.hero.ticker === ticker) stock = allData.hero;
  else {
    const sup = allData.supporting.find((s) => s.ticker === ticker);
    if (sup) stock = sup;
    else {
      const h = allData.portfolio.holdings.find((h) => h.ticker === ticker);
      if (h) stock = {
        ticker: h.ticker,
        name: h.ticker,
        lane: "smart_money",
        cmp: h.cmp,
        change_pct: ((h.cmp - h.avg) / h.avg) * 100,
        score: 0.50,
        thesis: "Currently in your portfolio. Avg cost ₹" + h.avg.toLocaleString("en-IN") + " · " + h.qty + " shares.",
      };
    }
  }
  if (!stock) return null;

  const meta = window.LANE_META[stock.lane];
  const series = allData.detail_chart;
  const up = stock.change_pct >= 0;
  const changeColor = up ? "#22D3A4" : "#F87171";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(10,10,11,0.85)", backdropFilter: "blur(8px)",
        display: "flex", justifyContent: "center", alignItems: "flex-start",
        padding: "48px 24px", overflow: "auto",
        animation: "tilt-fade-in 0.18s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 1000,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          position: "relative",
          animation: "tilt-slide-up 0.22s ease-out",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 18, right: 18,
            width: 34, height: 34,
            background: "transparent",
            border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--fg-muted)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="x" size={15} />
        </button>

        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase",
            color: "var(--fg-faint)", marginBottom: 18,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>Brief</span>
          <Icon name="arrow-right" size={11} color="var(--fg-faint)" />
          <span>Stock Detail</span>
          <Icon name="arrow-right" size={11} color="var(--fg-faint)" />
          <span style={{ color: "var(--fg-muted)" }}>{ticker}</span>
        </div>

        {/* Identity row */}
        <header
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 28,
            flexWrap: "wrap", gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 36, fontWeight: 600, letterSpacing: -0.5,
                color: "var(--fg)", margin: 0, lineHeight: 1,
              }}
            >
              {stock.ticker}
            </h1>
            <div style={{ marginTop: 6, fontSize: 14, color: "var(--fg-muted)" }}>
              {stock.name} · NSE
            </div>
          </div>
          <LaneTag lane={stock.lane} size="md" />
        </header>

        {/* Big number row */}
        <div
          style={{
            display: "flex", gap: 36, marginBottom: 28, alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Label>CMP</Label>
            <Big>{fmtINR(stock.cmp)}</Big>
          </div>
          <div>
            <Label>Today</Label>
            <Big style={{ color: changeColor }}>{fmtPct(stock.change_pct)}</Big>
          </div>
          <div>
            <Label>Score</Label>
            <Big style={{ color: meta.color }}>{stock.score.toFixed(2)}</Big>
          </div>
        </div>

        {/* Chart */}
        <Sparkline series={series} accent={meta.color} />

        {/* Indicators grid */}
        {stock.indicators && (
          <section style={{ marginTop: 30 }}>
            <SectionTitle>Technical indicators</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 1, background: "var(--border)",
                borderRadius: 10, overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              <IndicatorCell label="RSI" value={stock.indicators.rsi} hint="40–68 band" />
              <IndicatorCell label="MACD days+" value={stock.indicators.macd_days_positive} hint="positive cross" />
              <IndicatorCell label="EMA20 dist" value={`+${stock.indicators.ema20_distance_pct}%`} hint="above 20-day" />
              <IndicatorCell label="52w high" value={`${stock.indicators.week52_high_distance_pct}%`} hint="discount" />
              <IndicatorCell label="Vol vs 30d" value={`${stock.indicators.volume_vs_30d_pct}%`} hint="participation" />
              <IndicatorCell label="Sector" value={stock.indicators.sector_state} hint="rotation state" />
            </div>
          </section>
        )}

        {/* Thesis */}
        {stock.thesis && (
          <section style={{ marginTop: 26 }}>
            <SectionTitle>Thesis</SectionTitle>
            <p
              style={{
                fontSize: 14.5, lineHeight: 1.65, color: "var(--fg)",
                margin: 0, textWrap: "pretty",
              }}
            >
              {stock.thesis}
            </p>
          </section>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: 32, paddingTop: 18,
            borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "var(--fg-faint)",
            flexWrap: "wrap", gap: 12,
          }}
        >
          <span>read-only · no order execution</span>
          <span>data delayed ~15min · NSE feed</span>
        </footer>
      </div>
    </div>
  );
};

const Label = ({ children }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase",
      color: "var(--fg-faint)", marginBottom: 6,
    }}
  >
    {children}
  </div>
);
const Big = ({ children, style }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 28, fontWeight: 500, color: "var(--fg)",
      letterSpacing: -0.5, lineHeight: 1, ...style,
    }}
  >
    {children}
  </div>
);
const SectionTitle = ({ children }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase",
      color: "var(--fg-muted)", marginBottom: 14,
    }}
  >
    {children}
  </div>
);
const IndicatorCell = ({ label, value, hint }) => (
  <div style={{ background: "var(--bg-card)", padding: "14px 16px" }}>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
        color: "var(--fg-faint)", marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 18, color: "var(--fg)", fontWeight: 500,
        textTransform: typeof value === "string" ? "capitalize" : "none",
      }}
    >
      {value}
    </div>
    <div
      style={{
        marginTop: 4, fontSize: 10.5, color: "var(--fg-faint)",
      }}
    >
      {hint}
    </div>
  </div>
);

const Sparkline = ({ series, accent }) => {
  const w = 920;
  const h = 220;
  const padX = 0;
  const padY = 12;
  const xs = series.map((d) => d.day);
  const ys = series.map((d) => d.value);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const sx = (x) => padX + ((x - xmin) / (xmax - xmin)) * (w - padX * 2);
  const sy = (y) => padY + (1 - (y - ymin) / (ymax - ymin)) * (h - padY * 2);
  const path = series.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.day).toFixed(1)} ${sy(d.value).toFixed(1)}`).join(" ");
  const area = path + ` L ${sx(xmax)} ${h - padY} L ${sx(xmin)} ${h - padY} Z`;
  const last = series[series.length - 1];

  return (
    <section style={{ marginTop: 24 }}>
      <SectionTitle>Price · 90 days</SectionTitle>
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 12,
          position: "relative",
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`} width="100%" height={h}
          style={{ display: "block", overflow: "visible" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* gridlines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={0} x2={w}
              y1={padY + p * (h - padY * 2)} y2={padY + p * (h - padY * 2)}
              stroke="var(--border)" strokeDasharray="2 4"
            />
          ))}
          <path d={area} fill="url(#sparkfill)" />
          <path d={path} fill="none" stroke={accent} strokeWidth="1.75" />
          {/* last point */}
          <circle cx={sx(last.day)} cy={sy(last.value)} r="4" fill={accent} />
          <circle cx={sx(last.day)} cy={sy(last.value)} r="9" fill={accent} opacity="0.2" />
        </svg>
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, color: "var(--fg-faint)",
          }}
        >
          <span>−90d</span>
          <span>−60d</span>
          <span>−30d</span>
          <span>today</span>
        </div>
      </div>
    </section>
  );
};

window.StockDetail = StockDetail;
