// LaneTag — small reusable pill, color by lane.
const LaneTag = ({ lane, size = "md", style: styleOverride = {} }) => {
  const meta = window.LANE_META[lane];
  if (!meta) return null;
  const sizes = {
    sm: { fontSize: 9.5, padding: "3px 7px", letterSpacing: 0.8 },
    md: { fontSize: 10.5, padding: "5px 10px", letterSpacing: 0.9 },
    lg: { fontSize: 11, padding: "6px 12px", letterSpacing: 1 },
  };
  const s = sizes[size];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        textTransform: "uppercase",
        color: meta.color,
        background: meta.color + "14",
        border: `1px solid ${meta.color}33`,
        borderRadius: 999,
        ...s,
        ...styleOverride,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: meta.color,
          boxShadow: `0 0 8px ${meta.color}99`,
        }}
      />
      {meta.label}
    </span>
  );
};

window.LaneTag = LaneTag;
