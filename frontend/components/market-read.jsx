// MarketRead — paragraph tile above the hero.
const MarketRead = ({ data }) => {
  const dateStr = new Date(data.snapshot_date + "T09:30:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const { tickers_scanned, total_picks, lane_counts } = data.scan_stats;

  return (
    <section
      style={{
        background: "var(--bg-elev)",
        borderRadius: 12,
        padding: "26px 32px 22px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* subtle top-left glow */}
      <div
        style={{
          position: "absolute", top: -120, left: -120, width: 300, height: 300,
          background: "radial-gradient(circle, rgba(167,139,250,0.10), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <header
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Market Read · {dateStr}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, color: "var(--fg-muted)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: "#22D3A4",
            boxShadow: "0 0 8px #22D3A488",
          }} />
          LIVE · 09:42 IST
        </div>
      </header>

      <p
        style={{
          fontSize: 16, lineHeight: 1.6, color: "var(--fg)",
          margin: 0, maxWidth: 760, textWrap: "pretty",
        }}
      >
        {data.market_read}
      </p>

      <footer
        style={{
          marginTop: 18, paddingTop: 14,
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 28, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: "var(--fg-muted)",
        }}
      >
        <ScanStat label="Scanned" value={tickers_scanned} />
        <ScanStat label="Picks" value={total_picks} />
        <span style={{ color: "var(--border-strong)" }}>·</span>
        <ScanStat label="Strong" value={lane_counts.strong} color="#22D3A4" />
        <ScanStat label="Momentum" value={lane_counts.momentum} color="#7DD3FC" />
        <ScanStat label="Value" value={lane_counts.value} color="#FBBF24" />
        <ScanStat label="Smart Money" value={lane_counts.smart_money} color="#A78BFA" />
      </footer>
    </section>
  );
};

const ScanStat = ({ label, value, color }) => (
  <span style={{ display: "inline-flex", gap: 8, alignItems: "baseline" }}>
    <span style={{ color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 10 }}>
      {label}
    </span>
    <span style={{ color: color || "var(--fg)", fontWeight: 600 }}>{value}</span>
  </span>
);

window.MarketRead = MarketRead;
