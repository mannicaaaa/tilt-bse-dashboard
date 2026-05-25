// PortfolioSidebar — sticky right rail.
const PortfolioSidebar = ({ data, onOpenStock }) => {
  const { fmtINR, fmtPct, Icon } = window;
  const pnlUp = data.pnl_abs >= 0;
  const dayUp = data.day_pnl_abs >= 0;

  const actionColor = {
    HOLD: "var(--fg-muted)",
    AVERAGE: "#FBBF24",
    REVIEW: "#F87171",
    SELL: "#F87171",
    BUY: "#22D3A4",
  };

  return (
    <aside
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px 20px",
        position: "sticky", top: 24,
        display: "flex", flexDirection: "column",
        gap: 22,
        maxHeight: "calc(100vh - 48px)",
        overflow: "auto",
      }}
    >
      <header>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--fg-muted)", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>Portfolio</span>
          <span style={{ color: "var(--fg-faint)", fontSize: 10 }}>
            {data.holdings.length} holdings
          </span>
        </div>

        {/* Big PnL number */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28, fontWeight: 500,
              color: "var(--fg)", letterSpacing: -0.5, lineHeight: 1,
            }}
          >
            {fmtINR(data.current_value, { decimals: 0 })}
          </div>
          <div
            style={{
              marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: pnlUp ? "#22D3A4" : "#F87171",
            }}
          >
            {fmtINR(data.pnl_abs, { sign: true, decimals: 0 })}
            <span style={{ marginLeft: 8 }}>
              {fmtPct(data.pnl_pct)} overall
            </span>
          </div>
        </div>

        {/* invested + day pnl */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 1, marginTop: 14,
            background: "var(--border)",
            borderRadius: 8, overflow: "hidden",
          }}
        >
          <MiniStat
            label="Invested"
            value={fmtINR(data.total_invested, { decimals: 0 })}
          />
          <MiniStat
            label="Today"
            value={fmtPct(data.day_pnl_pct)}
            color={dayUp ? "#22D3A4" : "#F87171"}
            sub={fmtINR(data.day_pnl_abs, { sign: true, decimals: 0 })}
          />
        </div>
      </header>

      {/* Holdings */}
      <section>
        <SidebarHeading>
          Holdings
          <span style={{ color: "var(--fg-faint)", marginLeft: 8 }}>({data.holdings.length})</span>
        </SidebarHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 8 }}>
          {data.holdings.map((h) => (
            <div
              key={h.ticker}
              onClick={() => onOpenStock && onOpenStock(h.ticker)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10, alignItems: "center",
                padding: "8px 4px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span
                style={{
                  color: "var(--fg)", fontWeight: 500,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {h.ticker}
              </span>
              <span
                style={{
                  color: h.pnl_pct >= 0 ? "#22D3A4" : "#F87171",
                  minWidth: 56, textAlign: "right",
                }}
              >
                {fmtPct(h.pnl_pct, { decimals: 1 })}
              </span>
              <span
                style={{
                  color: actionColor[h.action] || "var(--fg-muted)",
                  fontSize: 9.5, letterSpacing: 0.6,
                  minWidth: 54, textAlign: "right",
                }}
              >
                {h.action}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Today's actions */}
      <section
        style={{
          background: "linear-gradient(180deg, rgba(251,191,36,0.07), rgba(251,191,36,0.02))",
          border: "1px solid rgba(251,191,36,0.25)",
          borderRadius: 10, padding: "14px 14px 14px",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
            color: "#FBBF24", marginBottom: 10,
          }}
        >
          <Icon name="alert" size={12} color="#FBBF24" />
          Today's Actions
        </div>
        <p
          style={{
            fontSize: 12.5, lineHeight: 1.5, color: "var(--fg)",
            margin: 0,
          }}
        >
          <strong>{data.flagged_for_action.length} holdings</strong> flagged for averaging
        </p>
        <div
          style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10,
          }}
        >
          {data.flagged_for_action.map((t) => (
            <button
              key={t}
              onClick={() => onOpenStock && onOpenStock(t)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5, fontWeight: 600,
                padding: "5px 10px",
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.35)",
                borderRadius: 999,
                color: "#FBBF24",
                cursor: "pointer",
                letterSpacing: 0.4,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Connect broker */}
      <section
        style={{
          marginTop: "auto",
          paddingTop: 16, borderTop: "1px solid var(--border)",
        }}
      >
        <button
          disabled
          style={{
            width: "100%",
            background: "transparent",
            border: "1px dashed var(--border-strong)",
            color: "var(--fg-faint)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            cursor: "not-allowed",
            fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <Icon name="external-link" size={12} color="var(--fg-faint)" />
          Connect Groww
          <span style={{ marginLeft: 6, color: "var(--fg-faint)", fontSize: 10 }}>· soon</span>
        </button>
      </section>
    </aside>
  );
};

const SidebarHeading = ({ children }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
      color: "var(--fg-muted)",
    }}
  >
    {children}
  </div>
);

const MiniStat = ({ label, value, color, sub }) => (
  <div style={{ background: "var(--bg-card)", padding: "10px 12px" }}>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase",
        color: "var(--fg-faint)", marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13.5, fontWeight: 500,
        color: color || "var(--fg)",
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5, color: "var(--fg-faint)", marginTop: 2,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

window.PortfolioSidebar = PortfolioSidebar;
