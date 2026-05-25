// Screen 5 — Backtest

const { Icon, fmt, Card, Button, Tag, StatusBadge, EmptyState, StatTile, PageHeader, SectionLabel } = window;
const { useState, useMemo } = React;

const DateField = ({ label, value, onChange }) => (
  <div className="inline-flex flex-col gap-1.5">
    <label className="text-[11px] uppercase tracking-wider text-fg-dim font-medium">{label}</label>
    <div className="relative">
      <Icon.Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-8 pr-2.5 bg-ink-600 border border-line rounded-md text-[13px] text-fg mono w-[150px] focus:outline-none focus:border-bull/50 ring-focus"
      />
    </div>
  </div>
);

const CumulativeChart = ({ strat, bench, width = 880, height = 280 }) => {
  const margin = { top: 16, right: 16, bottom: 28, left: 56 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const all = [...strat, ...bench];
  const min = Math.min(...all) * 1.05;
  const max = Math.max(...all) * 1.05;
  const yScale = (v) => margin.top + h - ((v - min) / (max - min)) * h;
  const xStep = w / (strat.length - 1);

  const path = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep},${yScale(v)}`).join(' ');
  const areaPath = (series) => `${path(series)} L ${margin.left + (series.length - 1) * xStep},${yScale(min)} L ${margin.left},${yScale(min)} Z`;

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => min + (max - min) * (i / yTicks));

  const xLabels = [0, 0.25, 0.5, 0.75, 0.99].map((p) => Math.floor(p * (strat.length - 1)));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="stratGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22D3A4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22D3A4" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={margin.left} x2={width - margin.right} y1={yScale(v)} y2={yScale(v)} stroke="#23232A" strokeDasharray="2 4" />
          <text x={margin.left - 8} y={yScale(v) + 3} fontSize="10.5" fill="#71717A" textAnchor="end" fontFamily="JetBrains Mono">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {/* zero line */}
      <line x1={margin.left} x2={width - margin.right} y1={yScale(0)} y2={yScale(0)} stroke="#3a3a44" />

      <path d={areaPath(strat)} fill="url(#stratGrad)" />
      <path d={path(bench)} fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={path(strat)} fill="none" stroke="#22D3A4" strokeWidth="2" />

      {/* x labels */}
      {xLabels.map((i, k) => {
        const x = margin.left + i * xStep;
        const monthOffset = strat.length - i;
        const date = new Date();
        date.setDate(date.getDate() - monthOffset);
        return (
          <text key={k} x={x} y={height - 8} fontSize="10.5" fill="#71717A" textAnchor="middle" fontFamily="JetBrains Mono">
            {date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
          </text>
        );
      })}

      {/* legend */}
      <g transform={`translate(${margin.left + 12}, ${margin.top + 12})`}>
        <rect x="0" y="0" width="220" height="46" rx="6" fill="#0A0A0B" fillOpacity="0.75" stroke="#23232A" />
        <line x1="10" y1="16" x2="28" y2="16" stroke="#22D3A4" strokeWidth="2" />
        <text x="34" y="20" fontSize="11.5" fill="#F4F4F5" fontFamily="Inter">Rally strategy</text>
        <text x="200" y="20" fontSize="11.5" fill="#22D3A4" fontFamily="JetBrains Mono" textAnchor="end">+27.6%</text>
        <line x1="10" y1="34" x2="28" y2="34" stroke="#FBBF24" strokeWidth="2" strokeDasharray="3 3" />
        <text x="34" y="38" fontSize="11.5" fill="#F4F4F5" fontFamily="Inter">Nifty 50 buy &amp; hold</text>
        <text x="200" y="38" fontSize="11.5" fill="#FBBF24" fontFamily="JetBrains Mono" textAnchor="end">+18.3%</text>
      </g>
    </svg>
  );
};

const ScreenBacktest = ({ data, navigate }) => {
  const [start, setStart] = useState('2025-05-25');
  const [end, setEnd] = useState('2026-05-25');
  const [running, setRunning] = useState(false);
  const [showSignals, setShowSignals] = useState(true);
  const [sigSort, setSigSort] = useState({ key: 'date', dir: 'desc' });

  const run = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 1400);
  };

  const sortedSignals = useMemo(() => {
    const rows = [...data.BACKTEST_SIGNALS];
    rows.sort((a, b) => {
      const av = a[sigSort.key], bv = b[sigSort.key];
      if (typeof av === 'string') return sigSort.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      return sigSort.dir === 'desc' ? bv - av : av - bv;
    });
    return rows;
  }, [data.BACKTEST_SIGNALS, sigSort]);

  return (
    <div className="tilt-fade">
      <PageHeader
        kicker="Validation"
        title="Backtest Results"
        subtitle="Rally filter performance on Nifty 500, past 12 months. Buy every signal, hold 30 days, sell."
      />

      {/* Run controls */}
      <Card className="mb-5">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="flex items-end gap-4 flex-wrap">
            <DateField label="Start date" value={start} onChange={setStart} />
            <DateField label="End date" value={end} onChange={setEnd} />
            <Button
              variant="primary"
              size="md"
              icon={running ? null : <Icon.Play size={14} />}
              onClick={run}
              loading={running}
            >
              {running ? 'Running backtest…' : 'Run backtest'}
            </Button>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-fg-muted">Last run</div>
            <div className="mono text-[13px] text-fg">{data.BACKTEST.lastRun}</div>
            <div className="mono text-[11px] text-fg-dim">duration {data.BACKTEST.duration}s</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-line-soft flex items-center gap-2 text-[11.5px] text-fg-dim">
          <Icon.Info size={12} />
          <span>Uses today's index constituents — survivorship bias disclosed in README. Strategy assumes equal sizing per trigger, 30-day hold.</span>
        </div>
      </Card>

      {/* Headline metrics */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatTile label="Total triggers" value={data.BACKTEST.triggers} sub="across 14 sectors" icon={<Icon.Target size={14} />} />
        <StatTile label="30-day hit rate" value={(data.BACKTEST.hitRate * 100).toFixed(1) + '%'} sub="positive at +30d" tone="bull" icon={<Icon.Check size={14} />} />
        <StatTile label="Avg forward return" value={'+' + (data.BACKTEST.avgReturn * 100).toFixed(1) + '%'} sub="mean 30d return per signal" tone="bull" icon={<Icon.TrendingUp size={14} />} />
        <StatTile label="Max drawdown / signal" value={(data.BACKTEST.maxDD * 100).toFixed(1) + '%'} sub="worst single-trigger" tone="bear" icon={<Icon.TrendingDown size={14} />} />
      </div>

      {/* Time-series chart */}
      <Card padding={false} className="mb-5">
        <div className="px-5 py-4 flex items-center justify-between border-b border-line-soft">
          <div>
            <div className="text-[13px] font-semibold text-fg">Cumulative return</div>
            <div className="text-[11.5px] text-fg-muted">Rally strategy vs Nifty 50 buy &amp; hold · trailing 12 months</div>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Strategy</div>
              <div className="mono text-[15px] font-bold text-bull">+27.6%</div>
            </div>
            <div className="w-px h-8 bg-line"></div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Benchmark</div>
              <div className="mono text-[15px] font-bold text-warn">+18.3%</div>
            </div>
            <div className="w-px h-8 bg-line"></div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Alpha</div>
              <div className="mono text-[15px] font-bold text-bull">+9.3%</div>
            </div>
          </div>
        </div>
        <div className="p-3">
          <CumulativeChart strat={data.BACKTEST_CURVE.strat} bench={data.BACKTEST_CURVE.bench} />
        </div>
      </Card>

      {/* Signal-by-signal table */}
      <Card padding={false}>
        <button
          onClick={() => setShowSignals((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-ink-600/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-fg">Signal-by-signal</span>
            <span className="mono text-[11.5px] text-fg-muted">{data.BACKTEST_SIGNALS.length} of {data.BACKTEST.triggers} triggers shown</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            {showSignals ? 'Collapse' : 'Expand'}
            {showSignals ? <Icon.ChevronUp size={14} /> : <Icon.ChevronDown size={14} />}
          </div>
        </button>
        {showSignals && (
          <div className="border-t border-line-soft overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-soft text-[11px] uppercase tracking-wider text-fg-dim">
                  {[
                    { key: 'date', label: 'Date', align: 'left' },
                    { key: 'ticker', label: 'Ticker', align: 'left' },
                    { key: 'sector', label: 'Sector', align: 'left' },
                    { key: 'r5', label: '+5d', align: 'right' },
                    { key: 'r15', label: '+15d', align: 'right' },
                    { key: 'r30', label: '+30d', align: 'right' },
                    { key: 'status', label: 'Status', align: 'center' },
                  ].map((c) => (
                    <th key={c.key} className={`px-4 py-3 font-medium text-${c.align}`}>
                      <button
                        onClick={() => setSigSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}
                        className={`inline-flex items-center gap-1 hover:text-fg transition-colors ${sigSort.key === c.key ? 'text-fg' : 'text-fg-dim'}`}
                      >
                        {c.label}
                        {sigSort.key === c.key && (sigSort.dir === 'desc' ? <Icon.ChevronDown size={12} /> : <Icon.ChevronUp size={12} />)}
                      </button>
                    </th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sortedSignals.map((sig, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate('stock', sig.ticker)}
                    className="border-b border-line-soft last:border-b-0 hover:bg-ink-600/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 mono text-[12.5px] text-fg">{sig.date}</td>
                    <td className="px-4 py-3 mono text-[13px] font-semibold text-fg">{sig.ticker}</td>
                    <td className="px-4 py-3"><Tag tone="muted">{sig.sector}</Tag></td>
                    <td className={`px-4 py-3 text-right mono text-[12.5px] ${sig.r5 >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(sig.r5)}</td>
                    <td className={`px-4 py-3 text-right mono text-[12.5px] ${sig.r15 >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(sig.r15)}</td>
                    <td className={`px-4 py-3 text-right mono text-[13.5px] font-semibold ${sig.r30 >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(sig.r30)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={sig.status} size="sm" /></td>
                    <td className="px-4 py-3 text-fg-faint group-hover:text-fg"><Icon.ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

window.ScreenBacktest = ScreenBacktest;
