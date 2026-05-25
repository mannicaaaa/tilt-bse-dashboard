// HeroPick — the centerpiece. Today's top conviction.
const HeroPick = ({ pick, onOpenDetail }) => {
  const meta = window.LANE_META[pick.lane];
  const { fmtINR, fmtPct, LaneTag } = window;
  const up = pick.change_pct >= 0;
  const changeColor = up ? "#22D3A4" : "#F87171";

  return (
    <section
      style={{
        position: "relative",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 32,
        marginBottom: 36,
        overflow: "hidden",
      }}
    >
      {/* lane glow corner */}
      <div
        style={{
          position: "absolute", top: -160, right: -120, width: 380, height: 380,
          background: `radial-gradient(circle, ${meta.color}1F, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${meta.color}66, transparent)`,
        }}
      />

      <header
        style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 28, position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--fg-muted)",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <Icon name="zap" size={12} color={meta.color} />
          Today's Top Conviction
        </div>
        <LaneTag lane={pick.lane} size="lg" />
      </header>

      {/* Identity row */}
      <div style={{ marginBottom: 24, position: "relative" }}>
        <h1
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 44, fontWeight: 600, letterSpacing: -0.5,
            color: "var(--fg)", margin: 0, lineHeight: 1,
          }}
        >
          {pick.ticker}
        </h1>
        <div
          style={{
            marginTop: 8, fontSize: 16, fontWeight: 400,
            color: "var(--fg-muted)",
          }}
        >
          {pick.name}
        </div>
      </div>

      {/* Price · change · score row */}
      <div
        style={{
          display: "flex", gap: 36, marginBottom: 32, alignItems: "baseline",
          flexWrap: "wrap", position: "relative",
        }}
      >
        <Stat
          label="CMP"
          value={fmtINR(pick.cmp)}
          big
        />
        <Stat
          label="Today"
          value={(
            <span style={{ color: changeColor }}>
              {fmtPct(pick.change_pct)}
              <span style={{ fontSize: 14, marginLeft: 8, color: "var(--fg-muted)" }}>
                {fmtINR(pick.change_abs, { sign: true })}
              </span>
            </span>
          )}
        />
        <Stat
          label="Composite"
          value={(
            <span style={{ color: meta.color }}>{pick.score.toFixed(2)}</span>
          )}
        />
      </div>

      {/* THESIS */}
      <Block title="Thesis">
        <p
          style={{
            fontSize: 15, lineHeight: 1.65, color: "var(--fg)",
            margin: 0, textWrap: "pretty",
          }}
        >
          {pick.thesis}
        </p>
      </Block>

      {/* WHY THIS */}
      <Block title="Why this, not others">
        <p
          style={{
            fontSize: 14, lineHeight: 1.55, fontStyle: "italic",
            color: "var(--fg-muted)", margin: 0, textWrap: "pretty",
          }}
        >
          {pick.why_this}
        </p>
      </Block>

      {/* Score breakdown bar */}
      <ScoreBar score={pick.score} breakdown={pick.score_breakdown} accent={meta.color} />

      {/* Pros · Cons */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
          marginTop: 28, marginBottom: 28,
        }}
      >
        <SignalList title="Key signals" items={pick.pros} variant="pro" />
        <SignalList title="Risk factors" items={pick.cons} variant="con" />
      </div>

      {/* If you'd invested... — return + SIP projections */}
      {pick.projections && <ProjectionsBlock projections={pick.projections} accent={meta.color} />}

      {/* Why top funds are buying this — credibility callouts */}
      {pick.fund_blurbs && pick.fund_blurbs.length > 0 && (
        <FundBlurbsBlock blurbs={pick.fund_blurbs} accent={meta.color} />
      )}

      {/* Footer CTA */}
      <footer
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 22, borderTop: "1px solid var(--border)",
          flexWrap: "wrap", gap: 16,
        }}
      >
        <button
          onClick={() => onOpenDetail && onOpenDetail(pick.ticker)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "var(--fg)", color: "var(--bg)",
            border: "none", borderRadius: 8, padding: "11px 18px",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
            transition: "transform 0.1s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${meta.color}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
        >
          View full chart &amp; indicators
          <Icon name="arrow-right" size={14} />
        </button>

        {pick.mf_context && pick.mf_context.held_by_count > 0 && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "var(--fg-muted)",
              padding: "8px 12px",
              background: meta.color + "10",
              borderRadius: 999,
              border: `1px solid ${meta.color}26`,
            }}
          >
            <Icon name="shield" size={12} color={meta.color} />
            Held by {pick.mf_context.held_by_count} tracked {pick.mf_context.held_by_count === 1 ? "MF" : "MFs"}
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <span style={{ color: "var(--fg-muted)" }}>
              {pick.mf_context.funds.slice(0, 2).join(" · ")}
            </span>
          </div>
        )}
      </footer>
    </section>
  );
};

const Stat = ({ label, value, big }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase",
        color: "var(--fg-faint)",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: big ? 32 : 22,
        fontWeight: 500,
        color: "var(--fg)",
        letterSpacing: -0.5,
        lineHeight: 1,
      }}
    >
      {value}
    </span>
  </div>
);

const Block = ({ title, children }) => (
  <div style={{ marginBottom: 22, position: "relative" }}>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
        color: "var(--fg-faint)", marginBottom: 8,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ProjectionsBlock — "If you invested ₹X today, here's what it could be worth"
// Two calculators inline: lump-sum and SIP. Users can edit the input amount.
// ─────────────────────────────────────────────────────────────────────────────
const ProjectionsBlock = ({ projections, accent }) => {
  const { fmtINR } = window;
  const [tab, setTab] = React.useState("lumpsum");
  const [lumpAmount, setLumpAmount] = React.useState(projections.lump_sum.default_investment);
  const [sipMonthly, setSipMonthly] = React.useState(projections.sip.default_monthly);

  // Scale projected_values by the ratio of new amount / default amount.
  // Linear because both lump-sum and SIP scale linearly with input principal.
  const lumpRows = projections.lump_sum.horizons.map((h) => ({
    label: h.label,
    value: (h.projected_value / projections.lump_sum.default_investment) * lumpAmount,
  }));
  const sipRows = projections.sip.horizons.map((h) => ({
    label: h.label,
    value: (h.projected_value / projections.sip.default_monthly) * sipMonthly,
  }));

  const rows = tab === "lumpsum" ? lumpRows : sipRows;
  const principal = tab === "lumpsum" ? lumpAmount : sipMonthly;

  return (
    <div
      style={{
        marginTop: 28,
        marginBottom: 28,
        background: "var(--bg-elev)",
        border: `1px solid ${accent}33`,
        borderRadius: 12,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--fg-faint)",
          }}
        >
          If you'd invested
        </div>
        <div style={{ display: "inline-flex", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { id: "lumpsum", label: "One-time" },
            { id: "sip", label: "Monthly SIP" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTab(opt.id)}
              style={{
                padding: "6px 14px",
                background: tab === opt.id ? accent + "1A" : "transparent",
                color: tab === opt.id ? accent : "var(--fg-muted)",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: 6,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>
          {tab === "lumpsum" ? "Invest" : "Per month"}
        </span>
        <div
          style={{
            display: "inline-flex", alignItems: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ color: "var(--fg-muted)", marginRight: 4 }}>₹</span>
          <input
            type="number"
            value={principal}
            min={1000}
            step={1000}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              if (tab === "lumpsum") setLumpAmount(v);
              else setSipMonthly(v);
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--fg)",
              fontSize: 16,
              fontFamily: "inherit",
              width: 100,
            }}
          />
        </div>
        {[
          tab === "lumpsum" ? 10000 : 2000,
          tab === "lumpsum" ? 50000 : 5000,
          tab === "lumpsum" ? 100000 : 10000,
        ].map((preset) => (
          <button
            key={preset}
            onClick={() => (tab === "lumpsum" ? setLumpAmount(preset) : setSipMonthly(preset))}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: "var(--fg-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
          </button>
        ))}
      </div>

      {/* Horizon grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, 1fr)`,
          gap: 12,
          marginBottom: 12,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 14,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.2,
                color: "var(--fg-faint)",
                marginBottom: 6,
              }}
            >
              In {row.label}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18,
                fontWeight: 600,
                color: accent,
                letterSpacing: -0.3,
              }}
            >
              {fmtINR(row.value, { decimals: 0 })}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--fg-faint)",
          lineHeight: 1.5,
          fontStyle: "italic",
          marginTop: 8,
        }}
      >
        {projections.disclaimer}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FundBlurbsBlock — credibility callouts for each MF holding this stock
// ─────────────────────────────────────────────────────────────────────────────
const FundBlurbsBlock = ({ blurbs, accent }) => (
  <div style={{ marginTop: 22, marginBottom: 22 }}>
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
        color: "var(--fg-faint)", marginBottom: 10,
      }}
    >
      Why this matters — top funds buying
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blurbs.map((b) => (
        <div
          key={b.short_name}
          style={{
            display: "flex",
            gap: 14,
            padding: 14,
            background: "var(--bg-elev)",
            borderLeft: `3px solid ${accent}`,
            borderRadius: 8,
            border: "1px solid var(--border)",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              minWidth: 0, flex: 1,
            }}
          >
            <div
              style={{
                fontWeight: 600, fontSize: 14, color: "var(--fg)", marginBottom: 4,
              }}
            >
              {b.short_name}
              {b.category && (
                <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 8, fontWeight: 400 }}>
                  · {b.category}
                </span>
              )}
            </div>
            {b.rank_blurb && (
              <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                {b.rank_blurb}
              </div>
            )}
          </div>
          {b.cagr_5y && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: accent }}>
                {b.cagr_5y}%
              </div>
              <div style={{ fontSize: 10, color: "var(--fg-faint)", letterSpacing: 0.8 }}>
                5Y CAGR
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const ScoreBar = ({ score, breakdown, accent }) => {
  const [hovered, setHovered] = React.useState(null);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const segs = Object.entries(breakdown);
  const labels = {
    momentum: "Momentum",
    upside: "Upside",
    rsi: "RSI",
    sector: "Sector",
  };
  return (
    <div
      style={{
        background: "var(--bg-elev)", borderRadius: 10,
        padding: "18px 20px", marginTop: 8,
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: "var(--fg-muted)",
          }}
        >
          Score{" "}
          <span style={{ color: accent, fontSize: 16, marginLeft: 6, fontWeight: 600 }}>
            {score.toFixed(2)}
          </span>
          <span style={{ marginLeft: 6, color: "var(--fg-faint)", fontSize: 11 }}>
            / 1.00
          </span>
        </div>
        {hovered && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "var(--fg-muted)",
            }}
          >
            {labels[hovered]} · <span style={{ color: "var(--fg)" }}>{breakdown[hovered].toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* segmented bar */}
      <div
        style={{
          display: "flex", height: 8, gap: 3,
          borderRadius: 999, overflow: "hidden",
          background: "var(--border)",
        }}
      >
        {segs.map(([k, v]) => (
          <div
            key={k}
            onMouseEnter={() => setHovered(k)}
            onMouseLeave={() => setHovered(null)}
            style={{
              flex: v,
              background: hovered === k ? accent : accent + (hovered ? "55" : "AA"),
              transition: "background 0.15s",
              cursor: "default",
            }}
          />
        ))}
        <div style={{ flex: 1 - total, background: "transparent" }} />
      </div>

      <div
        style={{
          display: "flex", justifyContent: "space-between", marginTop: 12,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
          color: "var(--fg-muted)", gap: 12, flexWrap: "wrap",
        }}
      >
        {segs.map(([k, v]) => (
          <span
            key={k}
            onMouseEnter={() => setHovered(k)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              cursor: "default",
              color: hovered === k ? "var(--fg)" : "var(--fg-muted)",
              transition: "color 0.15s",
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: 2,
                background: accent + "CC",
              }}
            />
            {labels[k]}
            <span style={{ color: "var(--fg-faint)" }}>{v.toFixed(2)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const SignalList = ({ title, items, variant }) => {
  const isPro = variant === "pro";
  const color = isPro ? "#22D3A4" : "#F87171";
  return (
    <div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase",
          color: "var(--fg-faint)", marginBottom: 12,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <li
            key={i}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              fontSize: 13.5, lineHeight: 1.45, color: "var(--fg)",
            }}
          >
            <span
              style={{
                marginTop: 2, color, flexShrink: 0,
                width: 14, display: "inline-flex", justifyContent: "center",
              }}
            >
              {isPro ? "✓" : "✗"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

window.HeroPick = HeroPick;
