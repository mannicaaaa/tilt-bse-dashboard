// Screen 1 (v2) — Today's Picks

const { Icon, fmt, Card, Button, Tag, SectorTag, StatusBadge, StockCard, LaneSection, EmptyLaneState, MutualFundsSection } = window;
const { useState, useMemo, useRef, useEffect } = React;

// Sector backdrop overlay — opens from the small pill in the hero
const SectorBackdropPanel = ({ sectors, onClose }) => {
  const sorted = [...sectors].sort((a, b) => b.momentum - a.momentum);
  return (
    <div className="absolute right-0 top-full mt-2 w-[520px] max-w-[90vw] bg-ink-800 border border-line-strong rounded-card shadow-lift p-5 z-40">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[13px] font-semibold text-fg">Sector backdrop</div>
          <div className="text-[11.5px] text-fg-muted mt-0.5">14 sectoral indices, sorted by momentum</div>
        </div>
        <button onClick={onClose} className="text-fg-dim hover:text-fg p-1 -m-1"><Icon.X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-ink-700 border border-line rounded-md">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                s.state === 'hot' ? 'bg-bull' : s.state === 'cold' ? 'bg-warn' : 'bg-fg-faint'
              }`} />
              <span className="text-[12px] text-fg truncate">{s.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`mono text-[11.5px] ${s.change >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(s.change)}</span>
              <span className="mono text-[12px] font-semibold text-fg w-9 text-right">{s.momentum.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-line-soft flex items-center gap-4 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-bull" /> Hot · momentum ≥ 0.70</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-fg-faint" /> Neutral</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warn" /> Cold · &lt; 0.30</span>
      </div>
    </div>
  );
};

// Tiny clickable summary pill (hot/neutral/cold counts)
const SectorBackdropPill = ({ sectors, onClick, active }) => {
  const counts = sectors.reduce((acc, s) => { acc[s.state]++; return acc; }, { hot: 0, neutral: 0, cold: 0 });
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 h-9 px-3 rounded-md border text-[12px] transition-colors duration-150 whitespace-nowrap ${
        active ? 'bg-ink-500 border-line-strong text-fg' : 'bg-ink-700 border-line text-fg-muted hover:text-fg hover:bg-ink-600'
      }`}
    >
      <span className="uppercase tracking-wider text-[10.5px] font-semibold text-fg-dim">Sector backdrop</span>
      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-bull" /><span className="mono text-fg">{counts.hot}</span> <span className="text-fg-muted">Hot</span></span>
      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-fg-faint" /><span className="mono text-fg">{counts.neutral}</span> <span className="text-fg-muted">Neutral</span></span>
      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warn" /><span className="mono text-fg">{counts.cold}</span> <span className="text-fg-muted">Cold</span></span>
      <Icon.ChevronDown size={12} className="text-fg-faint" />
    </button>
  );
};

const ScreenToday = ({ data, refreshing, lastRefreshedText, onRefresh, navigate, scanStats }) => {
  const [backdropOpen, setBackdropOpen] = useState(false);
  const backdropRef = useRef(null);

  // Dismiss overlay on outside click
  useEffect(() => {
    if (!backdropOpen) return;
    const onClick = (e) => {
      if (backdropRef.current && !backdropRef.current.contains(e.target)) setBackdropOpen(false);
    };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [backdropOpen]);

  const sectorById = useMemo(() => Object.fromEntries(data.SECTORS.map((s) => [s.id, s])), [data]);
  const picksByLane = useMemo(() => {
    const m = { strong: [], momentum: [], value: [], smart_money: [] };
    data.STOCKS.forEach((s) => { if (s.lane && m[s.lane]) m[s.lane].push(s); });
    return m;
  }, [data]);
  const pickedTickers = useMemo(
    () => new Set(data.STOCKS.filter((s) => s.lane).map((s) => s.ticker)),
    [data]
  );

  const laneIds = ['strong', 'momentum', 'value', 'smart_money'];
  const totalPicks = laneIds.reduce((acc, id) => acc + picksByLane[id].length, 0);
  const lanesWithPicks = laneIds.filter((id) => picksByLane[id].length > 0).length;

  return (
    <div className="tilt-fade">
      {/* Hero strip */}
      <div className="relative overflow-visible bg-ink-700 border border-line rounded-card mb-5 px-7 py-6">
        <div className="absolute inset-0 pointer-events-none opacity-[0.18] rounded-card overflow-hidden" style={{
          background: 'radial-gradient(700px 200px at 90% 0%, rgba(34,211,164,0.30), transparent 70%)'
        }} />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full border border-bull/30 bg-bull/10 text-bull text-[11px] font-semibold uppercase tracking-wider">
                <Icon.Sparkles size={12} />
                Today
              </span>
              <span className="text-[12px] text-fg-muted mono">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <h1 className="text-[30px] font-semibold text-fg tracking-tight leading-tight">Today's Picks</h1>
            <p className="mt-2 text-[14px] text-fg-muted leading-relaxed max-w-3xl">
              Scanned <span className="mono text-fg">{scanStats.tickers}</span> tickers across <span className="mono text-fg">14</span> sectors.
              <span className="mono text-fg"> {totalPicks}</span> candidates surfaced across <span className="mono text-fg">{lanesWithPicks}</span> {lanesWithPicks === 1 ? 'strategy' : 'strategies'}.
              Last refreshed <span className="mono text-fg-muted">{lastRefreshedText}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative" ref={backdropRef} onClick={(e) => e.stopPropagation()}>
              <SectorBackdropPill sectors={data.SECTORS} onClick={() => setBackdropOpen((v) => !v)} active={backdropOpen} />
              {backdropOpen && <SectorBackdropPanel sectors={data.SECTORS} onClose={() => setBackdropOpen(false)} />}
            </div>
            <Button
              variant="primary"
              size="lg"
              icon={<Icon.RefreshCw size={15} className={refreshing ? 'tilt-spin' : ''} />}
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh data'}
            </Button>
          </div>
        </div>
      </div>

      {/* Top: mutual funds cross-check (collapsed by default) */}
      <div className="mb-4">
        <MutualFundsSection
          funds={data.MUTUAL_FUNDS}
          pickedTickers={pickedTickers}
          onTickerClick={(t) => navigate('stock', t)}
        />
      </div>

      {/* Lanes — collapsible, all collapsed by default */}
      <div className="space-y-3">
        {data.LANES.map((lane) => {
          const picks = picksByLane[lane.id];
          // Short tag label for the card (top-right corner)
          const shortLabel =
            lane.id === 'strong'       ? 'Strong'   :
            lane.id === 'momentum'     ? 'Momentum' :
            lane.id === 'value'        ? 'Bargain'  :
            lane.id === 'smart_money'  ? 'MF Pick'  :
                                         'Pick';
          return (
            <LaneSection key={lane.id} lane={lane} count={picks.length}>
              {picks.length === 0 ? (
                <EmptyLaneState lane={lane} />
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                  {picks.map((s) => (
                    <StockCard
                      key={s.ticker}
                      stock={s}
                      sector={sectorById[s.sectorId]}
                      laneLabel={shortLabel}
                      laneAccent={lane.accent}
                      onOpen={() => navigate('stock', s.ticker, { lane: lane.id })}
                    />
                  ))}
                </div>
              )}
            </LaneSection>
          );
        })}
      </div>

      {/* Bottom note */}
      <div className="mt-10 pt-6 border-t border-line-soft text-[11.5px] text-fg-dim leading-relaxed max-w-3xl">
        <Icon.Info size={12} className="inline-block mr-1 -mt-0.5" />
        All picks are computed locally from technical filters — decision support, not investment advice. No orders are placed.
        Click any card to open the full chart, indicator panel, and filter triggers for that stock.
      </div>
    </div>
  );
};

window.ScreenToday = ScreenToday;
