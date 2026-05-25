// Screen 3 — Scan (Rally Scanner)

const { Icon, fmt, Card, Button, Tag, StatusBadge, IndicatorChip, indicatorTone, ScoreBar, EmptyState, PageHeader } = window;
const { useState, useMemo } = React;

const SECTOR_FILTER_OPTIONS = [
  { id: 'all',          label: 'All sectors' },
  { id: 'hot',          label: 'Hot only' },
  { id: 'hot_neutral',  label: 'Hot + Neutral' },
  { id: 'cold',         label: 'Cold' },
];

const SORTABLE = [
  { id: 'score', label: 'Score', align: 'right' },
  { id: 'cmp',   label: 'CMP',   align: 'right' },
  { id: 'change',label: 'Δ %',   align: 'right' },
  { id: 'rsi',   label: 'RSI',   align: 'right' },
  { id: 'macd',  label: 'MACD',  align: 'right' },
  { id: 'ema20', label: 'EMA20', align: 'right' },
  { id: 'gap52', label: '52W gap', align: 'right' },
];

const SortHeader = ({ id, label, current, dir, onSort, align = 'left' }) => {
  const active = current === id;
  return (
    <button
      onClick={() => onSort(id)}
      className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium hover:text-fg transition-colors ${active ? 'text-fg' : 'text-fg-dim'}`}
    >
      {label}
      {active ? (
        dir === 'desc' ? <Icon.ChevronDown size={12} /> : <Icon.ChevronUp size={12} />
      ) : <Icon.ChevronsUpDown size={10} className="opacity-50" />}
    </button>
  );
};

const ScreenScan = ({ data, navigate, initialFilter = 'all' }) => {
  const [sectorFilter, setSectorFilter] = useState(initialFilter);
  const [scoreMin, setScoreMin] = useState(0.5);
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [grouped, setGrouped] = useState(false);

  const sectorById = useMemo(() => Object.fromEntries(data.SECTORS.map((s) => [s.id, s])), [data]);

  const filtered = useMemo(() => {
    let rows = data.STOCKS.filter((s) => s.score >= scoreMin);
    if (sectorFilter !== 'all') {
      rows = rows.filter((s) => {
        const sec = sectorById[s.sectorId];
        if (!sec) return false;
        if (sectorFilter === 'hot') return sec.state === 'hot';
        if (sectorFilter === 'cold') return sec.state === 'cold';
        if (sectorFilter === 'hot_neutral') return sec.state !== 'cold';
        return true;
      });
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      return sort.dir === 'desc' ? bv - av : av - bv;
    });
    return rows;
  }, [data.STOCKS, scoreMin, sectorFilter, sort, sectorById]);

  const handleSort = (key) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });
  };

  const groupedBySector = useMemo(() => {
    const m = {};
    filtered.forEach((s) => { (m[s.sector] = m[s.sector] || []).push(s); });
    return Object.entries(m).sort((a, b) => b[1][0].score - a[1][0].score);
  }, [filtered]);

  return (
    <div className="tilt-fade">
      <PageHeader
        kicker="Scanner"
        title="Rally Scanner"
        subtitle="Stocks across the Nifty 500 passing momentum + value-gap filters. Sorted live; no apply needed."
      />

      {/* Filter chips card */}
      <Card padding={false} className="mb-4">
        <div className="px-5 py-4 flex flex-wrap items-center gap-5">
          {/* Sector strength */}
          <div className="flex items-center gap-2">
            <div className="text-[11px] uppercase tracking-wider text-fg-dim font-medium pr-1">Sector strength</div>
            <div className="inline-flex p-0.5 bg-ink-800 border border-line rounded-md">
              {SECTOR_FILTER_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSectorFilter(o.id)}
                  className={`h-7 px-2.5 text-[12px] font-medium rounded transition-colors duration-150 ${
                    sectorFilter === o.id ? 'bg-ink-500 text-fg' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score minimum slider */}
          <div className="flex items-center gap-3 min-w-[260px]">
            <div className="text-[11px] uppercase tracking-wider text-fg-dim font-medium pr-1">Min score</div>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={scoreMin}
              onChange={(e) => setScoreMin(parseFloat(e.target.value))}
              className="flex-1 accent-bull h-1"
              style={{ accentColor: '#22D3A4' }}
            />
            <div className="mono text-[13px] font-semibold text-fg w-10 text-right">{scoreMin.toFixed(2)}</div>
          </div>

          <div className="flex-1" />

          {/* Result count */}
          <div className="inline-flex items-center gap-2 px-2.5 h-7 rounded-md bg-ink-600 border border-line text-[12px]">
            <Icon.Hash size={12} className="text-fg-dim" />
            <span className="text-fg-muted">Showing</span>
            <span className="mono text-fg font-semibold">{filtered.length}</span>
            <span className="text-fg-muted">of</span>
            <span className="mono text-fg">{data.STOCKS.length}</span>
          </div>

          {/* Group toggle */}
          <div className="inline-flex p-0.5 bg-ink-800 border border-line rounded-md">
            <button
              onClick={() => setGrouped(false)}
              className={`h-7 px-2.5 text-[12px] font-medium rounded inline-flex items-center gap-1.5 transition-colors ${
                !grouped ? 'bg-ink-500 text-fg' : 'text-fg-muted hover:text-fg'
              }`}
              title="Flat list"
            >
              <Icon.ListTree size={13} />
              Flat
            </button>
            <button
              onClick={() => setGrouped(true)}
              className={`h-7 px-2.5 text-[12px] font-medium rounded inline-flex items-center gap-1.5 transition-colors ${
                grouped ? 'bg-ink-500 text-fg' : 'text-fg-muted hover:text-fg'
              }`}
              title="Group by sector"
            >
              <Icon.Layers size={13} />
              By sector
            </button>
          </div>
        </div>
      </Card>

      {/* Result table */}
      {!grouped ? (
        <Card padding={false}>
          <ScanTable rows={filtered} sort={sort} onSort={handleSort} sectorById={sectorById} navigate={navigate} />
          {filtered.length === 0 && (
            <EmptyState
              icon={<Icon.Radar size={22} />}
              title="No stocks match these filters"
              body="Try lowering the minimum score or widening the sector filter."
              action={<Button variant="secondary" size="sm" onClick={() => { setScoreMin(0); setSectorFilter('all'); }}>Reset filters</Button>}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedBySector.map(([sector, rows]) => {
            const secObj = data.SECTORS.find((s) => s.name === sector);
            return (
              <Card key={sector} padding={false}>
                <div className="px-5 py-3.5 flex items-center justify-between border-b border-line-soft">
                  <div className="flex items-center gap-3">
                    <span className="text-[13.5px] font-semibold text-fg">{sector}</span>
                    {secObj && <StatusBadge status={secObj.state} size="sm" />}
                    {secObj && <span className="mono text-[12px] text-fg-muted">mom {secObj.momentum.toFixed(2)}</span>}
                  </div>
                  <span className="text-[12px] text-fg-muted">
                    Top <span className="mono text-fg">{Math.min(5, rows.length)}</span> of <span className="mono text-fg">{rows.length}</span>
                  </span>
                </div>
                <ScanTable rows={rows.slice(0, 5)} sort={sort} onSort={handleSort} sectorById={sectorById} navigate={navigate} hideHeader />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Inner table component
const ScanTable = ({ rows, sort, onSort, sectorById, navigate, hideHeader = false }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      {!hideHeader && (
        <thead>
          <tr className="border-b border-line">
            <th className="text-left px-5 py-3 w-8 text-[11px] uppercase tracking-wider text-fg-dim font-medium">#</th>
            <th className="text-left px-3 py-3">
              <SortHeader id="ticker" label="Ticker" current={sort.key} dir={sort.dir} onSort={onSort} />
            </th>
            <th className="text-right px-3 py-3"><SortHeader id="cmp" label="CMP" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-right px-3 py-3"><SortHeader id="change" label="Δ %" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-right px-3 py-3"><SortHeader id="rsi" label="RSI" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-right px-3 py-3"><SortHeader id="macd" label="MACD" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-right px-3 py-3"><SortHeader id="ema20" label="EMA20" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-right px-3 py-3"><SortHeader id="gap52" label="52W gap" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="text-left px-3 py-3 text-[11px] uppercase tracking-wider text-fg-dim font-medium">Sector</th>
            <th className="text-right px-3 py-3 w-[160px]"><SortHeader id="score" label="Score" current={sort.key} dir={sort.dir} onSort={onSort} /></th>
            <th className="w-8"></th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((s, i) => {
          const sec = sectorById[s.sectorId];
          const scoreColor = s.score >= 0.75 ? 'text-bull' : s.score >= 0.5 ? 'text-warn' : 'text-bear';
          return (
            <tr
              key={s.ticker}
              onClick={() => navigate('stock', s.ticker)}
              className="border-b border-line-soft last:border-b-0 hover:bg-ink-600/60 cursor-pointer transition-colors group"
            >
              <td className="px-5 py-3 mono text-[11px] text-fg-faint w-8">{String(i + 1).padStart(2, '0')}</td>
              <td className="px-3 py-3">
                <div className="mono text-[13.5px] font-semibold text-fg">{s.ticker}</div>
                <div className="text-[11.5px] text-fg-muted truncate max-w-[200px]">{s.name}</div>
              </td>
              <td className="px-3 py-3 text-right mono text-[13px] text-fg">{fmt.num(s.cmp)}</td>
              <td className={`px-3 py-3 text-right mono text-[12.5px] ${s.change >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(s.change)}</td>
              <td className="px-3 py-3 text-right">
                <span className={`mono text-[12.5px] ${indicatorTone.rsi(s.rsi) === 'bull' ? 'text-bull' : indicatorTone.rsi(s.rsi) === 'warn' ? 'text-warn' : 'text-bear'}`}>{s.rsi}</span>
              </td>
              <td className="px-3 py-3 text-right">
                <span className={`mono text-[12.5px] ${indicatorTone.macd(s.macd) === 'bull' ? 'text-bull' : indicatorTone.macd(s.macd) === 'warn' ? 'text-warn' : 'text-bear'}`}>{s.macd >= 0 ? '+' : ''}{s.macd.toFixed(2)}</span>
              </td>
              <td className="px-3 py-3 text-right">
                <span className={`mono text-[12.5px] ${indicatorTone.ema20(s.cmp, s.ema20) === 'bull' ? 'text-bull' : indicatorTone.ema20(s.cmp, s.ema20) === 'warn' ? 'text-warn' : 'text-bear'}`}>{s.ema20.toFixed(0)}</span>
              </td>
              <td className="px-3 py-3 text-right">
                <span className={`mono text-[12.5px] ${indicatorTone.gap52(s.gap52) === 'bull' ? 'text-bull' : indicatorTone.gap52(s.gap52) === 'warn' ? 'text-warn' : 'text-bear'}`}>{s.gap52.toFixed(1)}%</span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <Tag tone="muted">{s.sector}</Tag>
                  {sec && <StatusBadge status={sec.state} size="sm" />}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 justify-end">
                  <ScoreBar parts={s.scoreParts} width={90} height={6} />
                  <span className={`mono text-[14px] font-bold ${scoreColor} w-10 text-right`}>{fmt.score(s.score)}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-fg-faint group-hover:text-fg transition-colors w-8"><Icon.ChevronRight size={14} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

window.ScreenScan = ScreenScan;
