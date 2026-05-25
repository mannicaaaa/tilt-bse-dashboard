// Reusable primitives for the Tilt prototype.
// Components: Card, Button, IconChip, StatusBadge, IndicatorChip, ScoreBar, StockRow, SectorTile, EmptyState, Tag

const { Icon } = window;
const { useState, useMemo, useRef, useEffect } = React;

// ---- Utility formatters ----
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
  <div
    className={`bg-ink-700 border border-line rounded-card shadow-card ${padding ? 'p-6' : ''} ${className}`}
    {...rest}
  >
    {children}
  </div>
);

// ---- Button ----
const Button = ({ children, variant = 'secondary', size = 'md', icon, iconRight, loading, className = '', ...rest }) => {
  const base = 'inline-flex items-center gap-2 font-medium transition-colors duration-150 select-none ring-focus disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px] rounded-md',
    md: 'h-9 px-3.5 text-[13px] rounded-lg',
    lg: 'h-11 px-5 text-[14px] rounded-lg',
  };
  const variants = {
    primary: 'bg-bull text-ink-900 hover:bg-[#1cb98f] active:bg-[#19a47e]',
    secondary: 'bg-ink-600 text-fg hover:bg-ink-500 border border-line',
    ghost: 'text-fg-muted hover:text-fg hover:bg-ink-600',
    danger: 'bg-bear/15 text-bear hover:bg-bear/25 border border-bear/30',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {loading ? <Icon.RefreshCw size={14} className="tilt-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
};

// ---- IconChip (square icon button) ----
const IconChip = ({ children, onClick, active, className = '', size = 32, title }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`inline-flex items-center justify-center rounded-md border transition-colors duration-150 ring-focus ${
      active
        ? 'bg-ink-500 border-line-strong text-fg'
        : 'bg-ink-700 border-line text-fg-muted hover:text-fg hover:bg-ink-600'
    } ${className}`}
    style={{ width: size, height: size }}
  >
    {children}
  </button>
);

// ---- Tag (small pill) ----
const Tag = ({ children, tone = 'muted', className = '' }) => {
  const tones = {
    muted: 'bg-ink-600 text-fg-muted border-line',
    bull: 'bg-bull/10 text-bull border-bull/25',
    bear: 'bg-bear/10 text-bear border-bear/25',
    warn: 'bg-warn/10 text-warn border-warn/25',
    info: 'bg-ink-500 text-fg border-line-strong',
  };
  return (
    <span className={`inline-flex items-center gap-1 h-[20px] px-1.5 text-[10.5px] font-medium tracking-wide uppercase rounded border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

// ---- StatusBadge ----
// Hold (green outlined) / Average (amber filled) / Sell (red filled) / Hot (green filled) / Cold (amber outlined)
const StatusBadge = ({ status, size = 'md' }) => {
  const map = {
    hold:    { label: 'HOLD',    cls: 'border-bull/40 text-bull bg-transparent' },
    average: { label: 'AVERAGE', cls: 'bg-warn text-ink-900 border-warn' },
    sell:    { label: 'SELL',    cls: 'bg-bear text-ink-900 border-bear' },
    hot:     { label: 'HOT',     cls: 'bg-bull text-ink-900 border-bull' },
    cold:    { label: 'COLD',    cls: 'border-warn/50 text-warn bg-transparent' },
    neutral: { label: 'NEUTRAL', cls: 'border-line-strong text-fg-muted bg-transparent' },
    winner:  { label: 'WINNER',  cls: 'bg-bull/15 text-bull border-bull/30' },
    loser:   { label: 'LOSER',   cls: 'bg-bear/15 text-bear border-bear/30' },
    flat:    { label: 'FLAT',    cls: 'border-line-strong text-fg-muted bg-transparent' },
    trap:    { label: 'TRAP',    cls: 'bg-bear/15 text-bear border-bear/30' },
  };
  const m = map[status] || map.neutral;
  const sizes = {
    sm: 'h-[18px] px-1.5 text-[10px]',
    md: 'h-[22px] px-2 text-[11px]',
    lg: 'h-[28px] px-2.5 text-[12px]',
  };
  return (
    <span className={`inline-flex items-center font-semibold tracking-wider rounded-[4px] border ${m.cls} ${sizes[size]}`}>
      {m.label}
    </span>
  );
};

// ---- IndicatorChip ----
// label (RSI), value (mono), and a dot indicating in-band/out-of-band.
// dot tones: bull (in band) / bear (out, bad direction) / warn (edge)
const IndicatorChip = ({ label, value, tone = 'bull', size = 'md', help }) => {
  const dotColor = { bull: 'bg-bull', bear: 'bg-bear', warn: 'bg-warn' }[tone];
  const sizes = {
    sm: { wrap: 'h-[24px] px-2 gap-1.5 text-[11px]', label: 'text-[10px]', value: 'text-[11px]', dot: 'w-1.5 h-1.5' },
    md: { wrap: 'h-[28px] px-2.5 gap-2 text-[12px]', label: 'text-[10.5px]', value: 'text-[12px]', dot: 'w-1.5 h-1.5' },
    lg: { wrap: 'h-[40px] px-3 gap-2.5 text-[13px]', label: 'text-[11px]', value: 'text-[14px]', dot: 'w-2 h-2' },
  };
  const s = sizes[size];
  return (
    <div className={`inline-flex items-center bg-ink-600 border border-line rounded-md ${s.wrap}`} title={help}>
      <span className={`${s.dot} rounded-full ${dotColor} ${tone === 'bull' ? 'shadow-[0_0_6px_rgba(34,211,164,0.5)]' : ''}`}></span>
      <span className={`text-fg-dim uppercase tracking-wider font-medium ${s.label}`}>{label}</span>
      <span className={`mono font-semibold text-fg ${s.value}`}>{value}</span>
    </div>
  );
};

// Build indicator tone for each spec
const indicatorTone = {
  rsi: (v) => (v >= 45 && v <= 62) ? 'bull' : (v < 35 || v > 70) ? 'bear' : 'warn',
  macd: (v) => v > 0.2 ? 'bull' : v > -0.1 ? 'warn' : 'bear',
  ema20: (cmp, ema) => cmp > ema ? 'bull' : cmp > ema * 0.98 ? 'warn' : 'bear',
  gap52: (g) => g >= -10 && g <= -4 ? 'bull' : g > -4 ? 'warn' : 'bear',
};

// ---- ScoreBar ----
// Horizontal bar showing the 4 components of the composite score stacked.
const ScoreBar = ({ parts, total, width = 200, showLegend = false, height = 8 }) => {
  // parts: { momentum, upside, rsi, sector }
  const colors = {
    momentum: '#22D3A4',
    upside: '#7DD3FC',
    rsi: '#A78BFA',
    sector: '#FBBF24',
  };
  const labels = { momentum: 'Momentum', upside: 'Upside', rsi: 'RSI band', sector: 'Sector' };
  const keys = ['momentum', 'upside', 'rsi', 'sector'];
  const sum = total ?? (parts.momentum + parts.upside + parts.rsi + parts.sector);
  const [hover, setHover] = useState(null);

  return (
    <div className="inline-flex flex-col gap-1.5" style={{ width }}>
      <div
        className="relative flex w-full overflow-hidden rounded-full bg-ink-500"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {keys.map((k) => {
          const w = (parts[k] / 1) * 100; // each part is contribution 0..max
          return (
            <div
              key={k}
              onMouseEnter={() => setHover(k)}
              style={{ width: `${w}%`, background: colors[k], opacity: hover && hover !== k ? 0.45 : 1 }}
              className="transition-opacity duration-150"
            />
          );
        })}
        {/* total marker */}
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-fg-muted">
          {keys.map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: colors[k] }} />
              {labels[k]} <span className="mono text-fg">{parts[k].toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}
      {hover && !showLegend && (
        <div className="text-[10.5px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: colors[hover] }} />
            {labels[hover]} <span className="mono text-fg">{parts[hover].toFixed(2)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

// ---- StockRow ----
const StockRow = ({ stock, onClick, dense = false, showScoreBar = true, showChips = true, idx }) => {
  const tone = stock.change >= 0 ? 'bull' : 'bear';
  const scoreColor = stock.score >= 0.75 ? 'text-bull' : stock.score >= 0.5 ? 'text-warn' : 'text-bear';
  return (
    <button
      onClick={onClick}
      className={`group w-full grid items-center gap-4 px-5 ${dense ? 'py-2.5' : 'py-3.5'} text-left transition-colors duration-150 hover:bg-ink-600/60 cursor-pointer border-b border-line-soft last:border-b-0`}
      style={{ gridTemplateColumns: 'minmax(0, 1fr) 110px 80px auto 180px 24px' }}
    >
      {/* Ticker + name */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {idx != null && <span className="mono text-[11px] text-fg-faint w-5 text-right">{String(idx + 1).padStart(2, '0')}</span>}
          <span className="mono text-[14px] font-semibold text-fg tracking-tight">{stock.ticker}</span>
          <Tag tone="muted">{stock.sector}</Tag>
        </div>
        <div className="text-[12px] text-fg-muted mt-0.5 truncate pl-7">{stock.name}</div>
      </div>

      {/* CMP */}
      <div className="text-right">
        <div className="mono text-[14px] font-semibold text-fg">{fmt.num(stock.cmp)}</div>
        <div className={`mono text-[11.5px] ${tone === 'bull' ? 'text-bull' : 'text-bear'}`}>{fmt.pct(stock.change)}</div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className={`mono text-[15px] font-bold ${scoreColor}`}>{fmt.score(stock.score)}</div>
        <div className="text-[10px] text-fg-dim uppercase tracking-wider">score</div>
      </div>

      {/* Indicator chips */}
      {showChips ? (
        <div className="flex items-center gap-1.5">
          <IndicatorChip label="RSI" value={stock.rsi} tone={indicatorTone.rsi(stock.rsi)} size="sm" />
          <IndicatorChip label="MACD" value={stock.macd.toFixed(2)} tone={indicatorTone.macd(stock.macd)} size="sm" />
          <IndicatorChip label="EMA20" value={stock.ema20.toFixed(0)} tone={indicatorTone.ema20(stock.cmp, stock.ema20)} size="sm" />
          <IndicatorChip label="52W" value={stock.gap52.toFixed(1) + '%'} tone={indicatorTone.gap52(stock.gap52)} size="sm" />
        </div>
      ) : <div />}

      {/* ScoreBar */}
      {showScoreBar ? (
        <div className="flex justify-end">
          <ScoreBar parts={stock.scoreParts} width={180} height={6} />
        </div>
      ) : <div />}

      {/* Chevron */}
      <div className="text-fg-faint group-hover:text-fg transition-colors">
        <Icon.ChevronRight size={16} />
      </div>
    </button>
  );
};

// ---- SectorTile ----
const SectorTile = ({ sector, onClick }) => {
  const stateMap = {
    hot:     { badge: 'hot',     wash: 'bg-bull/[0.06]', ring: 'border-bull/20',  label: 'text-bull',  icon: <Icon.Flame size={12} /> },
    neutral: { badge: 'neutral', wash: 'bg-ink-600',     ring: 'border-line',     label: 'text-fg-muted', icon: <Icon.Minus size={12} /> },
    cold:    { badge: 'cold',    wash: 'bg-warn/[0.05]', ring: 'border-warn/20',  label: 'text-warn',  icon: <Icon.Snowflake size={12} /> },
  };
  const m = stateMap[sector.state];
  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-card border ${m.ring} ${m.wash} p-4 transition-all duration-150 hover:-translate-y-[2px] hover:shadow-lift cursor-pointer overflow-hidden`}
    >
      {/* badge */}
      <div className="absolute top-3 right-3">
        <StatusBadge status={sector.state} size="sm" />
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <span className={m.label}>{m.icon}</span>
        <span className="uppercase tracking-wider font-medium">{sector.name}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="mono text-[28px] font-bold text-fg leading-none">{sector.momentum.toFixed(2)}</div>
        <div className="text-[11px] text-fg-dim uppercase tracking-wider">mom</div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="mono text-[13px] text-fg">{fmt.num(sector.index, sector.index > 1000 ? 0 : 2)}</div>
          <div className={`mono text-[11px] ${sector.change >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(sector.change)}</div>
        </div>
        <div className="text-right">
          <div className="mono text-[15px] text-fg font-semibold">{sector.count}</div>
          <div className="text-[10px] text-fg-dim uppercase tracking-wider">passing</div>
        </div>
      </div>
    </button>
  );
};

// ---- EmptyState ----
const EmptyState = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center text-center py-12 px-6">
    <div className="w-12 h-12 rounded-full bg-ink-600 border border-line flex items-center justify-center text-fg-muted">
      {icon || <Icon.Radar size={22} />}
    </div>
    <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
    {body && <p className="mt-1.5 text-[13px] text-fg-muted max-w-md leading-relaxed">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---- StatTile (used in dashboard footer + backtest headline) ----
const StatTile = ({ label, value, sub, tone = 'fg', icon, onClick }) => {
  const toneCls = { fg: 'text-fg', bull: 'text-bull', bear: 'text-bear', warn: 'text-warn' }[tone];
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left bg-ink-700 border border-line rounded-card p-4 transition-colors duration-150 ${onClick ? 'hover:bg-ink-600 cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-fg-dim">
        <span>{label}</span>
        {icon && <span className="text-fg-faint">{icon}</span>}
      </div>
      <div className={`mt-1.5 mono text-[24px] font-bold ${toneCls} leading-none`}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-fg-muted">{sub}</div>}
    </button>
  );
};

// expose
Object.assign(window, {
  fmt, Card, Button, IconChip, Tag, StatusBadge, IndicatorChip, indicatorTone,
  ScoreBar, StockRow, SectorTile, EmptyState, StatTile,
});
