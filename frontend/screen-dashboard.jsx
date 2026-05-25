// Screen 1 — Dashboard

const { Icon, fmt, Card, Button, Tag, StatusBadge, StockRow, SectorTile, EmptyState, StatTile, PageHeader, SectionLabel } = window;
const { useState } = React;

const ScreenDashboard = ({ data, refreshing, lastRefreshed, onRefresh, navigate, refreshStats }) => {
  const convictions = data.STOCKS.filter((s) => s.score >= 0.8).slice(0, 5);
  const sortedSectors = [...data.SECTORS].sort((a, b) => b.momentum - a.momentum);
  const holdingCounts = data.HOLDINGS.reduce((acc, h) => { acc[h.status] = (acc[h.status] || 0) + 1; return acc; }, {});

  return (
    <div className="tilt-fade">
      {/* Hero strip */}
      <div className="relative overflow-hidden bg-ink-700 border border-line rounded-card mb-6">
        <div className="absolute inset-0 pointer-events-none opacity-[0.18]" style={{
          background: 'radial-gradient(800px 200px at 90% 0%, rgba(34,211,164,0.35), transparent 70%)'
        }} />
        <div className="relative grid items-center gap-6 p-7" style={{ gridTemplateColumns: '1fr auto' }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full border border-bull/30 bg-bull/10 text-bull text-[11px] font-semibold uppercase tracking-wider">
                <Icon.Sparkles size={12} />
                Today's read
              </span>
              <span className="text-[12px] text-fg-muted mono">{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <h2 className="text-[28px] font-semibold text-fg tracking-tight leading-tight">Today's Conviction Picks</h2>
            <p className="mt-1.5 text-[14px] text-fg-muted max-w-2xl">
              Stocks passing the Rally filter <span className="text-fg">inside currently-Hot sectors</span> — composite score ≥ 0.80,
              MACD positive, RSI in 45–62 band, value gap intact.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Icon.RefreshCw size={16} className={refreshing ? 'tilt-spin' : ''} />}
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Recomputing…' : 'Refresh data'}
            </Button>
            <div className="text-[12px] text-fg-dim mono text-right">
              Last updated <span className="text-fg-muted">{lastRefreshed}</span>
            </div>
          </div>
        </div>
        {refreshStats && (
          <div className="relative px-7 pb-4 -mt-2">
            <div className="text-[12px] text-fg-muted mono flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-bull">
                <Icon.Check size={12} />
                <span>Refreshed in {refreshStats.duration}s</span>
              </span>
              <span className="text-fg-faint">·</span>
              <span>{refreshStats.tickers} tickers updated</span>
              <span className="text-fg-faint">·</span>
              <span>{refreshStats.cacheHits} cache hits</span>
              <span className="text-fg-faint">·</span>
              <span>scan window: 60d</span>
            </div>
          </div>
        )}
      </div>

      {/* Conviction picks grid */}
      <div className="mb-8">
        <SectionLabel right={
          <button onClick={() => navigate('scan')} className="text-[12px] text-fg-muted hover:text-fg inline-flex items-center gap-1 transition-colors">
            See full scan <Icon.ArrowUpRight size={12} />
          </button>
        }>
          Conviction picks · {convictions.length} signals
        </SectionLabel>
        <Card padding={false}>
          {convictions.length > 0 ? (
            <div>
              {convictions.map((s, i) => (
                <StockRow key={s.ticker} stock={s} idx={i} onClick={() => navigate('stock', s.ticker)} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon.Radar size={22} />}
              title="No rally signals today"
              body="Today's market has no signals matching all four filters — the sector rotation overlay is showing 5 hot sectors, but none have rally candidates inside the entry band right now."
              action={<Button variant="secondary" size="sm" onClick={() => navigate('scan')} icon={<Icon.Radar size={14} />}>Open full scan</Button>}
            />
          )}
        </Card>
      </div>

      {/* Sector heatmap */}
      <div className="mb-8">
        <SectionLabel right={
          <div className="flex items-center gap-3 text-[11px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-bull"></span> Hot</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-fg-faint"></span> Neutral</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-warn"></span> Cold</span>
          </div>
        }>
          Sector strength · 14 indices · sorted by momentum
        </SectionLabel>
        <div className="grid grid-cols-4 gap-3">
          {sortedSectors.map((s) => (
            <SectorTile key={s.id} sector={s} onClick={() => navigate('scan', null, { sectorFilter: 'hot' })} />
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-fg-dim leading-relaxed max-w-3xl">
          <Icon.Info size={11} className="inline-block mr-1 -mt-0.5" />
          Overlapping indices intentional — Banking trio (Banking / Private Banking / PSU) and Pharma / Healthcare are different lenses on the same theme.
        </p>
      </div>

      {/* Quick stats */}
      <div>
        <SectionLabel>Portfolio at a glance</SectionLabel>
        <div className="grid grid-cols-4 gap-3">
          <StatTile
            label="Holdings · Hold"
            value={holdingCounts.hold || 0}
            sub="Filters passing"
            tone="bull"
            icon={<Icon.Check size={14} />}
            onClick={() => navigate('portfolio', null, { tab: 'hold' })}
          />
          <StatTile
            label="Holdings · Average"
            value={holdingCounts.average || 0}
            sub="Watch for dip"
            tone="warn"
            icon={<Icon.TrendingDown size={14} />}
            onClick={() => navigate('portfolio', null, { tab: 'average' })}
          />
          <StatTile
            label="Holdings · Sell"
            value={holdingCounts.sell || 0}
            sub="Exit candidates"
            tone="bear"
            icon={<Icon.AlertTriangle size={14} />}
            onClick={() => navigate('portfolio', null, { tab: 'sell' })}
          />
          <StatTile
            label="Last backtest"
            value="Yesterday"
            sub="184 triggers · 61% hit rate"
            tone="fg"
            icon={<Icon.History size={14} />}
            onClick={() => navigate('backtest')}
          />
        </div>
      </div>
    </div>
  );
};

window.ScreenDashboard = ScreenDashboard;
