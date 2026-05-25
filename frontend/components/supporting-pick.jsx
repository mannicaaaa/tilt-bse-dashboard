// SupportingPickRow — full-width list row.
const SupportingPickRow = ({ pick, onOpen }) => {
  const meta = window.LANE_META[pick.lane];
  const { fmtINR, fmtPct, LaneTag, Icon } = window;
  const up = pick.change_pct >= 0;
  const changeColor = up ? "#22D3A4" : "#F87171";
  const [hover, setHover] = React.useState(false);

  return (
    <article
      onClick={() => onOpen && onOpen(pick.ticker)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: hover ? "var(--bg-card-hover)" : "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 22px",
        cursor: "pointer",
        transition: "background 0.15s, transform 0.15s, border-color 0.15s",
        transform: hover ? "translateY(-1px)" : "none",
        borderColor: hover ? meta.color + "55" : "var(--border)",
        overflow: "hidden",
      }}
    >
      {/* lane stripe */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: meta.color,
          opacity: hover ? 1 : 0.6,
          transition: "opacity 0.15s",
        }}
      />

      {/* Row 1: identity + numbers */}
      <header
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16, marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <LaneTag lane={pick.lane} size="sm" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16, fontWeight: 600, color: "var(--fg)",
                letterSpacing: -0.2,
              }}
            >
              {pick.ticker}
            </span>
            <span
              style={{
                fontSize: 13, color: "var(--fg-muted)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {pick.name}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex", alignItems: "baseline", gap: 22,
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14.5, color: "var(--fg)", fontWeight: 500 }}>
            {fmtINR(pick.cmp)}
          </span>
          <span style={{ fontSize: 13, color: changeColor, minWidth: 64, textAlign: "right" }}>
            {fmtPct(pick.change_pct)}
          </span>
          <span
            style={{
              fontSize: 13, color: meta.color, fontWeight: 600,
              minWidth: 40, textAlign: "right",
            }}
          >
            {pick.score.toFixed(2)}
          </span>
          {pick.cleared && (
            <span
              style={{
                color: meta.color, opacity: 0.85,
                display: "inline-flex", alignItems: "center",
              }}
              title="All lane conditions cleared"
            >
              <Icon name="check" size={14} color={meta.color} />
            </span>
          )}
        </div>
      </header>

      {/* Row 2: thesis */}
      <p
        style={{
          fontSize: 13.5, lineHeight: 1.5, margin: "8px 0 0",
          color: "var(--fg-muted)", textWrap: "pretty",
          paddingRight: 12,
        }}
      >
        {pick.thesis_short}
      </p>

      {/* Row 3: MF holdings (if any) */}
      {pick.mf_funds && pick.mf_funds.length > 0 && (
        <footer
          style={{
            marginTop: 10, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, color: "var(--fg-faint)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Icon name="shield" size={11} color="var(--fg-faint)" />
          <span style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Held by</span>
          <span style={{ color: "var(--fg-muted)" }}>
            {pick.mf_funds.join(" · ")}
          </span>
        </footer>
      )}
    </article>
  );
};

window.SupportingPickRow = SupportingPickRow;
