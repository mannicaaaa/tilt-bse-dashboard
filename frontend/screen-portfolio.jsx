// Screen 2 — Portfolio

const { Icon, fmt, Card, Button, Tag, StatusBadge, EmptyState, PageHeader } = window;
const { useState, useMemo } = React;

const Portfolio_TABS = [
  { id: 'all',     label: 'All' },
  { id: 'hold',    label: 'Hold' },
  { id: 'average', label: 'Average' },
  { id: 'sell',    label: 'Sell' },
];

const ScreenPortfolio = ({ data, navigate, initialTab = 'all' }) => {
  const [tab, setTab] = useState(initialTab);
  const stockByTicker = useMemo(() => Object.fromEntries(data.STOCKS.map((s) => [s.ticker, s])), [data]);

  const enriched = data.HOLDINGS.map((h) => {
    const s = stockByTicker[h.ticker];
    const cmp = s ? s.cmp : h.avgBuy;
    const value = cmp * h.qty;
    const cost = h.avgBuy * h.qty;
    const pnl = value - cost;
    const pnlPct = (pnl / cost) * 100;
    return { ...h, cmp, value, cost, pnl, pnlPct, name: s ? s.name : '—', sector: s ? s.sector : '—' };
  });

  const counts = enriched.reduce((acc, h) => { acc[h.status] = (acc[h.status] || 0) + 1; acc.all = (acc.all || 0) + 1; return acc; }, {});

  // Sort: sell first, average, hold
  const statusOrder = { sell: 0, average: 1, hold: 2 };
  const filtered = enriched
    .filter((h) => tab === 'all' || h.status === tab)
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.pnlPct - a.pnlPct);

  const totals = enriched.reduce(
    (acc, h) => { acc.cost += h.cost; acc.value += h.value; acc.pnl += h.pnl; return acc; },
    { cost: 0, value: 0, pnl: 0 }
  );
  const totalPct = (totals.pnl / totals.cost) * 100;

  return (
    <div className="tilt-fade">
      <PageHeader
        kicker="Holdings"
        title="Portfolio"
        subtitle={<>
          <span className="mono text-fg">{enriched.length}</span> holdings · <span className="mono text-fg">{fmt.inrShort(totals.cost)}</span> invested · current value <span className="mono text-fg">{fmt.inrShort(totals.value)}</span> · last sync 2 min ago.
        </>}
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Icon.Link2 size={14} />}>Sync from Groww</Button>
          </div>
        }
      />

      {/* Hero P&L strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-ink-700 border border-line rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-fg-dim">Invested</div>
          <div className="mt-1.5 mono text-[22px] font-bold text-fg">{fmt.inrShort(totals.cost)}</div>
          <div className="mt-1 text-[12px] text-fg-muted">across {enriched.length} positions</div>
        </div>
        <div className="bg-ink-700 border border-line rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-fg-dim">Current value</div>
          <div className="mt-1.5 mono text-[22px] font-bold text-fg">{fmt.inrShort(totals.value)}</div>
          <div className="mt-1 text-[12px] text-fg-muted">live CMP</div>
        </div>
        <div className={`bg-ink-700 border ${totals.pnl >= 0 ? 'border-bull/30' : 'border-bear/30'} rounded-card p-4`}>
          <div className="text-[11px] uppercase tracking-wider text-fg-dim">P&amp;L</div>
          <div className={`mt-1.5 mono text-[22px] font-bold ${totals.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {totals.pnl >= 0 ? '+' : '−'}{fmt.inrShort(Math.abs(totals.pnl))}
          </div>
          <div className={`mt-1 text-[12px] mono ${totals.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(totalPct)}</div>
        </div>
        <div className="bg-ink-700 border border-line rounded-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-fg-dim">Action mix</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px]"><span className="w-2 h-2 rounded-sm bg-bull"></span><span className="mono text-fg font-semibold">{counts.hold||0}</span> hold</span>
            <span className="inline-flex items-center gap-1.5 text-[12px]"><span className="w-2 h-2 rounded-sm bg-warn"></span><span className="mono text-fg font-semibold">{counts.average||0}</span> avg</span>
            <span className="inline-flex items-center gap-1.5 text-[12px]"><span className="w-2 h-2 rounded-sm bg-bear"></span><span className="mono text-fg font-semibold">{counts.sell||0}</span> sell</span>
          </div>
          <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-ink-500">
            <div className="bg-bull" style={{ width: ((counts.hold||0)/enriched.length)*100 + '%' }} />
            <div className="bg-warn" style={{ width: ((counts.average||0)/enriched.length)*100 + '%' }} />
            <div className="bg-bear" style={{ width: ((counts.sell||0)/enriched.length)*100 + '%' }} />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-line mb-0 px-1">
        {Portfolio_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative h-10 px-3 inline-flex items-center gap-2 text-[13px] font-medium transition-colors duration-150 ${
                active ? 'text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10.5px] mono font-semibold ${
                active ? 'bg-bull/15 text-bull' : 'bg-ink-600 text-fg-muted'
              }`}>
                {counts[t.id] || 0}
              </span>
              {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-bull rounded-t-sm" />}
            </button>
          );
        })}
      </div>

      {/* Holdings table */}
      <Card padding={false} className="rounded-t-none border-t-0">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-dim border-b border-line">
                  <th className="text-left px-5 py-3 font-medium">Ticker</th>
                  <th className="text-right px-3 py-3 font-medium mono">Qty</th>
                  <th className="text-right px-3 py-3 font-medium mono">Avg buy</th>
                  <th className="text-right px-3 py-3 font-medium mono">CMP</th>
                  <th className="text-right px-3 py-3 font-medium mono">P&amp;L</th>
                  <th className="text-center px-3 py-3 font-medium">Status</th>
                  <th className="text-left px-3 py-3 font-medium">Reason</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr
                    key={h.ticker}
                    onClick={() => navigate('stock', h.ticker)}
                    className="border-b border-line-soft last:border-b-0 hover:bg-ink-600/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[14px] font-semibold text-fg">{h.ticker}</span>
                        <Tag tone="muted">{h.sector}</Tag>
                      </div>
                      <div className="text-[12px] text-fg-muted mt-0.5">{h.name}</div>
                    </td>
                    <td className="px-3 py-4 text-right mono text-[13px] text-fg">{h.qty}</td>
                    <td className="px-3 py-4 text-right mono text-[13px] text-fg">{fmt.num(h.avgBuy)}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="mono text-[13px] text-fg">{fmt.num(h.cmp)}</div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className={`mono text-[14px] font-semibold ${h.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {h.pnl >= 0 ? '+' : '−'}{fmt.inrShort(Math.abs(h.pnl))}
                      </div>
                      <div className={`mono text-[11px] ${h.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{fmt.pct(h.pnlPct)}</div>
                    </td>
                    <td className="px-3 py-4 text-center"><StatusBadge status={h.status} /></td>
                    <td className="px-3 py-4 text-[12.5px] text-fg-muted max-w-[320px] leading-snug">{h.reason}</td>
                    <td className="px-3 py-4 text-fg-faint group-hover:text-fg transition-colors"><Icon.ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Icon.Briefcase size={22} />}
            title={`No ${tab} holdings`}
            body={`Nothing in your portfolio currently matches the ${tab} criteria.`}
          />
        )}
      </Card>

      <p className="mt-5 text-[12px] text-fg-dim max-w-3xl leading-relaxed">
        <Icon.Info size={12} className="inline-block mr-1 -mt-0.5" />
        Status is computed locally from technical filters — this is decision support, not investment advice. No orders are placed.
      </p>
    </div>
  );
};

window.ScreenPortfolio = ScreenPortfolio;
