// SectorStrip — horizontal bar viz of all 14 sectors.
const SectorStrip = ({ sectors, selectedSector, onSelect }) => {
  const { Icon } = window;
  const maxMag = Math.max(...sectors.map((s) => Math.abs(s.momentum)));
  const stateColor = {
    hot: "#22D3A4",
    neutral: "#7DD3FC",
    cold: "#F87171",
  };

  return (
    <section
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "22px 24px 18px",
        marginBottom: 36,
      }}
    >
      <header
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--fg-muted)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Icon name="trending-up" size={12} color="var(--fg-muted)" />
          Sector Rotation
        </div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 14,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
            color: "var(--fg-muted)",
          }}
        >
          <LegendDot color={stateColor.hot} label="Hot" />
          <LegendDot color={stateColor.neutral} label="Neutral" />
          <LegendDot color={stateColor.cold} label="Cold" />
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
          gap: 4, alignItems: "end",
          height: 92,
        }}
      >
        {sectors.map((s) => {
          const h = (Math.abs(s.momentum) / maxMag) * 70 + 6;
          const isUp = s.momentum >= 0;
          const isSelected = selectedSector === s.name;
          const c = stateColor[s.state];
          return (
            <div
              key={s.name}
              onClick={() => onSelect && onSelect(isSelected ? null : s.name)}
              style={{
                display: "flex", flexDirection: "column",
                justifyContent: "flex-end",
                cursor: "pointer", height: "100%", gap: 4,
                position: "relative",
              }}
              title={`${s.name} · ${s.momentum >= 0 ? "+" : ""}${s.momentum.toFixed(2)}`}
            >
              {/* baseline line */}
              <div
                style={{
                  position: "absolute", left: 0, right: 0, bottom: "50%",
                  borderTop: "1px dashed var(--border)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  height: isUp ? `${h}%` : 0,
                  background: `linear-gradient(180deg, ${c}DD, ${c}55)`,
                  borderRadius: "4px 4px 0 0",
                  marginBottom: isUp ? "50%" : 0,
                  marginTop: isUp ? "auto" : 0,
                  opacity: isSelected || !selectedSector ? 1 : 0.35,
                  transition: "opacity 0.15s",
                  boxShadow: isSelected ? `0 0 12px ${c}` : "none",
                  position: "relative",
                  alignSelf: "stretch",
                }}
              />
              {!isUp && (
                <div
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(0deg, ${c}DD, ${c}55)`,
                    borderRadius: "0 0 4px 4px",
                    marginTop: "50%",
                    opacity: isSelected || !selectedSector ? 1 : 0.35,
                    transition: "opacity 0.15s",
                    boxShadow: isSelected ? `0 0 12px ${c}` : "none",
                    alignSelf: "stretch",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* labels row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
          gap: 4, marginTop: 10,
        }}
      >
        {sectors.map((s) => {
          const isSelected = selectedSector === s.name;
          const short = s.name.replace("Nifty ", "");
          return (
            <div
              key={s.name}
              onClick={() => onSelect && onSelect(isSelected ? null : s.name)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                textAlign: "center",
                cursor: "pointer",
                color: isSelected ? "var(--fg)" : "var(--fg-faint)",
                lineHeight: 1.25,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{short}</div>
              <div style={{ color: stateColor[s.state], marginTop: 2 }}>
                {s.momentum >= 0 ? "+" : "−"}{Math.abs(s.momentum).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSector && (
        <div
          style={{
            marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)",
            fontSize: 12, color: "var(--fg-muted)",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <Icon name="filter" size={12} color="var(--fg-muted)" />
          Filtering picks by <strong style={{ color: "var(--fg)" }}>{selectedSector}</strong>
          <button
            onClick={() => onSelect(null)}
            style={{
              marginLeft: "auto", background: "transparent",
              border: "1px solid var(--border)", color: "var(--fg-muted)",
              borderRadius: 999, padding: "4px 10px", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Clear
          </button>
        </div>
      )}
    </section>
  );
};

const LegendDot = ({ color, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
    {label}
  </span>
);

window.SectorStrip = SectorStrip;
