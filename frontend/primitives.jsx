// v2 primitives — Card, Button, Tag, StatusBadge, ScoreBar, StockCard, LaneSection,
// EmptyLaneState, PnLPill, IconChip, StatTile, IndicatorChip, indicatorTone, fmt.

const { Icon } = window;
const { useState, useMemo, useRef, useEffect } = React;

// ---- formatters ----
const fmt = {
  inr: (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
  inrShort: (n) => {
    if (Math.abs(n) >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
    if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k';
    return '₹' + n.toFixed(0);
  },
  pct: (n, digits = 2) => (n >= 0 ? '+' : '') + n.toFixed(digits) + '%',
  num: (n, digits = 2) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits }),
  score: (n) => n.toFixed(2),
};

// ---- Card ----
const Card = ({ children, className = '', padding = true, ...rest }) => (
  <div className={`bg-ink-700 border border-line rounded-card shadow-card ${padding ? 'p-6' : ''} ${className}`} {...rest}>
    {children}
  </div>
);

// ---- Button ----
const Button = ({ children, variant = 'secondary', size = 'md', icon, iconRight, loading, className = '', ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 select-none ring-focus disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px] rounded-md',
    md: 'h-9 px-3.5 text-[13px] rounded-lg',
    lg: 'h-11 px-5 text-[14px] rounded-lg',
  };
  const variants = {
    primary:  'bg-bull text-ink-900 hover:bg-[#1cb98f] active:bg-[#19a47e]',
    secondary:'bg-ink-600 text-fg hover:bg-ink-500 border border-line',
    outline:  'bg-transparent text-fg hover:bg-ink-600 border border-line-strong',
    ghost:    'text-fg-muted hover:text-fg hover:bg-ink-600',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {loading ? <Icon.RefreshCw size={14} className="tilt-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
};

// ---- IconChip ----
const IconChip = ({ children, onClick, active, className = '', size = 32, title }) => (
  <button
    onClick={onClick} title={title} aria-label={title}
    className={`inline-flex items-center justify-center rounded-md border transition-colors duration-150 ring-focus ${
      active ? 'bg-ink-500 border-line-strong text-fg'
             : 'bg-ink-700 border-line text-fg-muted hover:text-fg hover:bg-ink-600'
    } ${className}`}
    style={{ width: size, height: size }}
  >{children}</button>
);

// ---- Tag (small pill) ----
const Tag = ({ children, tone = 'muted', className = '' }) => {
  const tones = {
    muted: 'bg-ink-600 text-fg-muted border-line',
    bull:  'bg-bull/10 text-bull border-bull/25',
    bear:  'bg-bear/10 text-bear border-bear/25',
    warn:  'bg-warn/10 text-warn border-warn/25',
    info:  'bg-ink-500 text-fg border-line-strong',
  };
  return (
    <span className={`inline-flex items-center gap-1 h-[20px] px-1.5 text-[10.5px] font-medium tracking-wide uppercase rounded border whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

// ---- SectorTag — sector pill colored by Hot/Neutral/Cold ----
const SectorTag = ({ name, state }) => {
  const map = {
    hot:     { cls: 'bg-bull/10 text-bull border-bull/30',  dot: 'bg-bull',   label: 'Hot' },
    neutral: { cls: 'bg-ink-600 text-fg-muted border-line', dot: 'bg-fg-faint', label: 'Neutral' },
    cold:    { cls: 'bg-warn/10 text-warn border-warn/30',  dot: 'bg-warn',   label: 'Cold' },
  };
  const m = map[state] || map.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 h-[22px] px-2 text-[11px] font-medium rounded border whitespace-nowrap ${m.cls}`}>
      <span className="text-fg-muted">{name}</span>
      <span className={`w-1 h-1 rounded-full ${m.dot}`} />
      <span className="uppercase tracking-wider text-[10px] font-semibold">{m.label}</span>
    </span>
  );
};

// ---- StatusBadge ----
const StatusBadge = ({ status, size = 'md' }) => {
  const map = {
    hold:    { label: 'HOLD',    cls: 'border-bull/40 text-bull bg-transparent' },
    average: { label: 'AVERAGE', cls: 'bg-warn text-ink-900 border-warn' },
    sell:    { label: 'SELL',    cls: 'bg-bear text-ink-900 border-bear' },
    hot:     { label: 'HOT',     cls: 'bg-bull text-ink-900 border-bull' },
    cold:    { label: 'COLD',    cls: 'border-warn/50 text-warn bg-transparent' },
    neutral: { label: 'NEUTRAL', cls: 'border-line-strong text-fg-muted bg-transparent' },
  };
  const m = map[status] || map.neutral;
  const sizes = {
    sm: 'h-[18px] px-1.5 text-[10px]',
    md: 'h-[22px] px-2 text-[11px]',
    lg: 'h-[28px] px-2.5 text-[12px]',
  };
  return (
    <span className={`inline-flex items-center font-semibold tracking-wider rounded-[4px] border ${m.cls} ${sizes[size]} whitespace-nowrap`}>
      {m.label}
    </span>
  );
};

// ---- PnLPill ----
const PnLPill = ({ value, pct, size = 'md' }) => {
  const bull = value >= 0;
  const sizes = { sm: 'text-[11px]', md: 'text-[12.5px]', lg: 'text-[14px]' };
  return (
    <div className={`mono font-semibold ${bull ? 'text-bull' : 'text-bear'} ${sizes[size]}`}>
      <span>{bull ? '+' : '−'}{fmt.inrShort(Math.abs(value)).replace('₹', '₹')}</span>
      {pct != null && <span className="text-[11px] font-medium ml-1.5 opacity-80">({fmt.pct(pct)})</span>}
    </div>
  );
};

// ---- ScoreBar (4-segment) ----
const ScoreBar = ({ parts, width = 200, showLegend = false, height = 8, compact = false }) => {
  const colors = { momentum: '#22D3A4', upside: '#7DD3FC', rsi: '#A78BFA', sector: '#FBBF24' };
  const labels = { momentum: 'momentum', upside: 'upside', rsi: 'rsi', sector: 'sector' };
  const keys = ['momentum', 'upside', 'rsi', 'sector'];
  const [hover, setHover] = useState(null);
  const total = parts.momentum + parts.upside + parts.rsi + parts.sector;

  return (
    <div className="inline-flex flex-col gap-1.5" style={{ width }}>
      <div className="relative flex w-full overflow-hidden rounded-full bg-ink-500" style={{ height }} onMouseLeave={() => setHover(null)}>
        {keys.map((k) => (
          <div key={k}
            onMouseEnter={() => setHover(k)}
            style={{ width: `${parts[k] * 100}%`, background: colors[k], opacity: hover && hover !== k ? 0.4 : 1 }}
            className="transition-opacity duration-150"
          />
        ))}
      </div>
      {showLegend && (
        <div className={`flex flex-wrap items-center ${compact ? 'gap-x-2.5 gap-y-1' : 'gap-x-3 gap-y-1'} text-[10.5px] text-fg-muted`}>
          {keys.map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: colors[k] }} />
              <span>{labels[k]}</span>
              <span className="mono text-fg font-medium">{parts[k].toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}
      {hover && !showLegend && (
        <div className="text-[10.5px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-sm" style={{ background: colors[hover] }} />
            {labels[hover]} <span className="mono text-fg">{parts[hover].toFixed(2)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

// ---- IndicatorChip ----
const indicatorTone = {
  rsi:   (v) => (v >= 45 && v <= 62) ? 'bull' : (v < 35 || v > 70) ? 'bear' : 'warn',
  macd:  (v) => v > 0.2 ? 'bull' : v > -0.1 ? 'warn' : 'bear',
  ema20: (cmp, ema) => cmp > ema ? 'bull' : cmp > ema * 0.98 ? 'warn' : 'bear',
  gap52: (g) => g >= -16 && g <= -5 ? 'bull' : g > -5 ? 'warn' : 'bear',
};

const IndicatorChip = ({ label, value, tone = 'bull', size = 'md' }) => {
  const dot = { bull: 'bg-bull', bear: 'bg-bear', warn: 'bg-warn' }[tone];
  const sizes = {
    sm: 'h-[24px] px-2 gap-1.5 text-[11px]',
    md: 'h-[28px] px-2.5 gap-2 text-[12px]',
    lg: 'h-[40px] px-3 gap-2.5 text-[13px]',
  };
  return (
    <div className={`inline-flex items-center bg-ink-600 border border-line rounded-md ${sizes[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-fg-dim uppercase tracking-wider font-medium text-[10.5px]">{label}</span>
      <span className="mono font-semibold text-fg">{value}</span>
    </div>
  );
};

// ---- StatTile ----
const StatTile = ({ label, value, sub, tone = 'fg', icon, onClick }) => {
  const toneCls = { fg: 'text-fg', bull: 'text-bull', bear: 'text-bear', warn: 'text-warn' }[tone];
  return (
    <button onClick={onClick}
      className={`group w-full text-left bg-ink-700 border border-line rounded-card p-4 transition-colors duration-150 ${onClick ? 'hover:bg-ink-600 cursor-pointer' : 'cursor-default'}`}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-fg-dim">
        <span>{label}</span>
        {icon && <span className="text-fg-faint">{icon}</span>}
      </div>
      <div className={`mt-1.5 mono text-[24px] font-bold ${toneCls} leading-none`}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-fg-muted">{sub}</div>}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StockCard — the v2 hero primitive.
// Structure: top header (ticker + sector tag) | numerics row | score bar |
// pros list | cons list | CTA button. 2px left border + tiny lane tag in top-right.
// ─────────────────────────────────────────────────────────────────────────────
const StockCard = ({ stock, sector, laneLabel, laneAccent, onOpen }) => {
  const change = stock.change;
  const scoreTone = stock.score >= 0.75 ? 'text-bull' : stock.score >= 0.5 ? 'text-warn' : 'text-bear';
  const scoreBorder = stock.score >= 0.75 ? 'border-bull/30' : stock.score >= 0.5 ? 'border-warn/30' : 'border-bear/30';

  return (
    <div
      className="group relative bg-ink-700 border border-line rounded-card overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-[1px] hover:shadow-lift"
      style={{ borderLeft: `2px solid ${laneAccent}` }}
    >
      {/* Lane label tag, top-right */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className="inline-flex items-center h-[20px] px-1.5 text-[10px] font-semibold tracking-wider uppercase rounded border whitespace-nowrap"
          style={{ color: laneAccent, borderColor: laneAccent + '50', background: laneAccent + '14' }}
        >
          {laneLabel}
        </span>
      </div>

      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3 pr-20">
          <div className="min-w-0 flex-1">
            <div className="mono text-[18px] font-bold text-fg tracking-tight leading-none">{stock.ticker}</div>
            <div className="mt-1 text-[12px] text-fg-muted truncate">{stock.name}</div>
          </div>
        </div>
        <div className="mt-2">
          <SectorTag name={stock.sector} state={sector?.state || 'neutral'} />
        </div>
      </div>

      {/* Numerics row */}
      <div className="px-5 pb-4 flex items-end justify-between gap-3 border-b border-line-soft">
        <div className="min-w-0">
          <div className="mono text-[26px] font-bold text-fg leading-none tracking-tight">{fmt.inr(stock.cmp).replace(/\.\d+/, m => m.length === 3 ? m : m)}</div>
          <div className={`mono text-[12px] font-semibold mt-1 ${change >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(change)} today</div>
        </div>
        <div className={`shrink-0 px-2 py-1.5 border rounded-md ${scoreBorder} text-right`}>
          <div className="text-[9.5px] uppercase tracking-wider text-fg-dim font-medium leading-none">Score</div>
          <div className={`mono text-[18px] font-bold leading-none mt-1 ${scoreTone}`}>{fmt.score(stock.score)}</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="px-5 py-4 border-b border-line-soft">
        <ScoreBar parts={stock.scoreParts} width="100%" height={6} showLegend compact />
      </div>

      {/* CTA — pushed to bottom by flex */}
      <div className="mt-auto px-5 pb-5 pt-4">
        <button
          onClick={onOpen}
          className="w-full h-9 inline-flex items-center justify-center gap-2 text-[12.5px] font-medium border rounded-md transition-colors duration-150 ring-focus"
          style={{
            color: laneAccent,
            borderColor: laneAccent + '50',
            background: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = laneAccent + '14'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          View chart &amp; details
          <Icon.ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  );
};

// ---- LaneSection — collapsible, collapsed by default ----
const LaneSection = ({ lane, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [tipOpen, setTipOpen] = useState(false);
  return (
    <section className={`${lane.accentClass}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 bg-ink-700 border border-line rounded-card hover:bg-ink-600/60 transition-colors group ring-focus"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="shrink-0 w-7 h-7 rounded-md inline-flex items-center justify-center transition-transform duration-150"
            style={{ background: lane.accent + '14', color: lane.accent, transform: open ? 'rotate(90deg)' : 'none' }}
            aria-hidden="true"
          >
            <Icon.ChevronRight size={15} />
          </span>
          <div className="w-[3px] h-7 rounded-sm shrink-0" style={{ background: lane.accent }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[16px] font-semibold text-fg tracking-tight leading-tight">{lane.label}</h2>
              <span
                className="inline-flex items-center h-[20px] px-1.5 text-[11px] mono font-semibold rounded border whitespace-nowrap"
                style={{ color: lane.accent, borderColor: lane.accent + '40', background: lane.accent + '10' }}
              >
                {count} {count === 1 ? 'pick' : 'picks'}
              </span>
              <div
                className="relative"
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="w-5 h-5 inline-flex items-center justify-center rounded-full text-fg-dim hover:text-fg hover:bg-ink-600 transition-colors cursor-help">
                  <Icon.Info size={13} />
                </span>
                {tipOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[340px] bg-ink-800 border border-line-strong rounded-lg p-3.5 shadow-lift z-30 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[12px] font-semibold text-fg mb-1.5">{lane.label}</div>
                    <div className="text-[12px] text-fg-muted leading-relaxed">{lane.filterPlain}</div>
                  </div>
                )}
              </div>
            </div>
            {!open && (
              <p className="mt-1 text-[12px] text-fg-muted leading-snug truncate">{lane.blurb}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[11.5px] text-fg-muted hidden sm:inline">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open && (
        <div className="pt-4 pb-1 tilt-fade">
          <p className="text-[12.5px] text-fg-muted leading-relaxed max-w-2xl mb-4 px-1">{lane.blurb}</p>
          {children}
        </div>
      )}
    </section>
  );
};

// ---- EmptyLaneState ----
const EmptyLaneState = ({ lane }) => (
  <div className="border border-dashed border-line-strong rounded-card p-8 text-center bg-ink-800/40">
    <div className="w-10 h-10 mx-auto rounded-full bg-ink-700 border border-line inline-flex items-center justify-center text-fg-muted">
      <Icon.Radar size={18} />
    </div>
    <div className="mt-3 text-[13px] font-medium text-fg">No {lane.label.toLowerCase()} setups today</div>
    <div className="mt-1 text-[12px] text-fg-muted max-w-sm mx-auto leading-relaxed">
      No stocks matching this strategy in the current scan window. Try again after the next refresh.
    </div>
  </div>
);

// ---- Generic EmptyState ----
const EmptyState = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center text-center py-10 px-6">
    <div className="w-12 h-12 rounded-full bg-ink-600 border border-line flex items-center justify-center text-fg-muted">
      {icon || <Icon.Radar size={22} />}
    </div>
    <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
    {body && <p className="mt-1.5 text-[13px] text-fg-muted max-w-md leading-relaxed">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MutualFundCard — compact fund tile showing overlap with today's picks.
// Highlights tickers that are in the day's pick list with a green ring.
// ─────────────────────────────────────────────────────────────────────────────
const MutualFundCard = ({ fund, pickedTickers, onTickerClick }) => {
  const matches = fund.holdings.filter((t) => pickedTickers.has(t));
  const others = fund.holdings.filter((t) => !pickedTickers.has(t));
  const aumText = fund.aum >= 1000 ? `₹${(fund.aum / 1000).toFixed(1)}k Cr` : `₹${fund.aum} Cr`;

  return (
    <div className="bg-ink-700 border border-line rounded-card p-4 flex flex-col gap-3 transition-colors duration-150 hover:bg-ink-600/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-fg leading-tight">{fund.short}</div>
          <div className="text-[11.5px] text-fg-muted mt-0.5">{fund.type} · AUM {aumText}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="mono text-[20px] font-bold text-bull leading-none">{matches.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-fg-dim mt-0.5">overlap</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matches.map((t) => (
          <button
            key={t}
            onClick={() => onTickerClick?.(t)}
            className="mono text-[11px] font-semibold px-1.5 h-[22px] rounded border border-bull/40 bg-bull/10 text-bull hover:bg-bull/20 transition-colors"
          >
            {t}
          </button>
        ))}
        {others.slice(0, 2).map((t) => (
          <span key={t} className="mono text-[11px] px-1.5 h-[22px] inline-flex items-center rounded border border-line bg-ink-600 text-fg-muted">
            {t}
          </span>
        ))}
        {others.length > 2 && (
          <span className="mono text-[11px] px-1.5 h-[22px] inline-flex items-center text-fg-dim">
            +{others.length - 2} more
          </span>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-line-soft text-[10.5px] text-fg-dim mono flex items-center justify-between">
        <span>Filing · {fund.lastFiling}</span>
      </div>
    </div>
  );
};

// MutualFundsSection — the top section of Today, collapsible like lanes.
const MutualFundsSection = ({ funds, pickedTickers, onTickerClick, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  // Sort funds by overlap count desc, then AUM desc
  const ranked = [...funds]
    .map((f) => ({ ...f, _overlap: f.holdings.filter((t) => pickedTickers.has(t)).length }))
    .sort((a, b) => b._overlap - a._overlap || b.aum - a.aum);

  const totalOverlap = ranked.reduce((acc, f) => acc + f._overlap, 0);
  const uniqueStocks = new Set();
  ranked.forEach((f) => f.holdings.forEach((t) => pickedTickers.has(t) && uniqueStocks.add(t)));

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 bg-ink-700 border border-line rounded-card hover:bg-ink-600/60 transition-colors ring-focus"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="shrink-0 w-7 h-7 rounded-md inline-flex items-center justify-center transition-transform duration-150 bg-ink-500 text-fg-muted"
            style={{ transform: open ? 'rotate(90deg)' : 'none' }}
            aria-hidden="true"
          >
            <Icon.ChevronRight size={15} />
          </span>
          <div className="w-7 h-7 rounded-md inline-flex items-center justify-center bg-ink-500 text-fg-muted border border-line shrink-0">
            <Icon.Layers size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[16px] font-semibold text-fg tracking-tight leading-tight">
                Held by India's top mutual funds
              </h2>
              <span className="inline-flex items-center h-[20px] px-1.5 text-[11px] mono font-semibold rounded border whitespace-nowrap bg-ink-600 border-line text-fg">
                {funds.length} funds
              </span>
            </div>
            {!open && (
              <p className="mt-1 text-[12px] text-fg-muted leading-snug truncate">
                {ranked.length} large- and multi-cap funds hold {uniqueStocks.size} of today's picks across {totalOverlap} positions.
              </p>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[11.5px] text-fg-muted hidden sm:inline">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="pt-4 tilt-fade">
          <p className="text-[12.5px] text-fg-muted leading-relaxed max-w-3xl mb-4 px-1">
            A cross-check on conviction. Stocks in green pills are in today's pick list. AUM and overlap
            counts pulled from each fund's latest monthly filing.
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {ranked.map((f) => (
              <MutualFundCard key={f.name} fund={f} pickedTickers={pickedTickers} onTickerClick={onTickerClick} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

Object.assign(window, {
  fmt, Card, Button, IconChip, Tag, SectorTag, StatusBadge, PnLPill, ScoreBar,
  IndicatorChip, indicatorTone, StatTile,
  StockCard, LaneSection, EmptyLaneState, EmptyState,
  MutualFundCard, MutualFundsSection,
});
