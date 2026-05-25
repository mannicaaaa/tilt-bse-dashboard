// Screen 2 (v2) — Portfolio (simplified single table)

const { Icon, fmt, Card, Button, Tag, PnLPill, StatusBadge, EmptyState, PageHeader } = window;
const { useState, useMemo } = React;

const ScreenPortfolio = ({ data, navigate }) => {
  const stockByTicker = useMemo(() => Object.fromEntries(data.STOCKS.map((s) => [s.ticker, s])), [data]);
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });

  const enriched = data.HOLDINGS.map((h) => {
    const s = stockByTicker[h.ticker];
    const cmp = s ? s.cmp : h.avgBuy;
    const value = cmp * h.qty;
    const cost = h.avgBuy * h.qty;
    const pnl = value - cost;
    const pnlPct = (pnl / cost) * 100;
    return { ...h, cmp, value, cost, pnl, pnlPct, name: s?.name || '—', sector: s?.sector || '—' };
  });

  const counts = enriched.reduce((acc, h) => { acc[h.status] = (acc[h.status] || 0) + 1; return acc; }, {});
  const totals = enriched.reduce((a, h) => ({ cost: a.cost + h.cost, value: a.value + h.value, pnl: a.pnl + h.pnl }), { cost: 0, value: 0, pnl: 0 });
  const totalPct = (totals.pnl / totals.cost) * 100;

  const statusOrder = { sell: 0, average: 1, hold: 2 };
  const sorted = [...enriched].sort((a, b) => {
    if (sort.key === 'status') return (statusOrder[a.status] - statusOrder[b.status]) * (sort.dir === 'asc' ? 1 : -1) || b.pnlPct - a.pnlPct;
    if (sort.key === 'ticker') return a.ticker.localeCompare(b.ticker) * (sort.dir === 'asc' ? 1 : -1);
    const av = a[sort.key], bv = b[sort.key];
    return (av - bv) * (sort.dir === 'asc' ? 1 : -1);
  });

  const doSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'status' ? 'asc' : 'desc' });

  const SortHdr = ({ k, label, align = 'left' }) => (
    <button
      onClick={() => doSort(k)}
      className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium transition-colors ${sort.key === k ? 'text-fg' : 'text-fg-dim hover:text-fg'}`}
    >
      {label}
      {sort.key === k
        ? (sort.dir === 'desc' ? <Icon.ChevronDown size={12} /> : <Icon.ChevronUp size={12} />)
        : <Icon.ChevronsUpDown size={10} className="opacity-50" />}
    </button>
  );

  return (
    <div className="tilt-fade">
      <PageHeader
        kicker="Holdings"
        title="Portfolio"
        right={<Button variant="secondary" icon={<Icon.Link2 size={14} />}>Sync from Groww</Button>}
      />

      {/* One-line summary strip */}
      <div className="mb-4 px-5 py-3.5 bg-ink-700 border border-line rounded-card flex items-center gap-x-6 gap-y-2 flex-wrap">
        <span className="text-[13px] text-fg-muted">
          <span className="mono text-fg font-semibold">{enriched.length}</span> holdings
        </span>
        <span className="w-px h-4 bg-line shrink-0"></span>
        <span className="text-[13px] text-fg-muted">
          <span className="mono text-fg font-semibold">{fmt.inrShort(totals.cost)}</span> invested
        </span>
        <span className="w-px h-4 bg-line shrink-0"></span>
        <span className="text-[13px] text-fg-muted inline-flex items-center gap-1.5">
          P&amp;L <PnLPill value={totals.pnl} pct={totalPct} />
        </span>
        <span className="w-px h-4 bg-line shrink-0"></span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-bull" /> Hold <span className="mono text-fg font-semibold">{counts.hold || 0}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-warn" /> Average <span className="mono text-fg font-semibold">{counts.average || 0}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
          <span className="w-1.5 h-1.5 rounded-sm bg-bear" /> Sell <span className="mono text-fg font-semibold">{counts.sell || 0}</span>
        </span>
        <div className="flex-1"></div>
        <span className="mono text-[11.5px] text-fg-dim">Synced 2 min ago</span>
      </div>

      {/* Holdings table */}
      <Card padding={false}>
        {sorted.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3"><SortHdr k="ticker" label="Ticker" /></th>
                  <th className="text-right px-3 py-3"><SortHdr k="qty" label="Qty" /></th>
                  <th className="text-right px-3 py-3"><SortHdr k="avgBuy" label="Avg buy" /></th>
                  <th className="text-right px-3 py-3"><SortHdr k="cmp" label="CMP" /></th>
                  <th className="text-right px-3 py-3"><SortHdr k="pnl" label="P&L" /></th>
                  <th className="text-center px-3 py-3"><SortHdr k="status" label="Action" /></th>
                  <th className="text-left px-3 py-3 text-[11px] uppercase tracking-wider text-fg-dim font-medium">Reason</th>
                  <th className="text-left px-3 py-3 text-[11px] uppercase tracking-wider text-fg-dim font-medium">Sector</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
                  <tr
                    key={h.ticker}
                    onClick={() => navigate('stock', h.ticker)}
                    className="border-b border-line-soft last:border-b-0 hover:bg-ink-600/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="mono text-[13.5px] font-semibold text-fg">{h.ticker}</div>
                      <div className="text-[11.5px] text-fg-muted truncate max-w-[200px]">{h.name}</div>
                    </td>
                    <td className="px-3 py-3.5 text-right mono text-[13px] text-fg">{h.qty}</td>
                    <td className="px-3 py-3.5 text-right mono text-[13px] text-fg">{fmt.num(h.avgBuy)}</td>
                    <td className="px-3 py-3.5 text-right mono text-[13px] text-fg">{fmt.num(h.cmp)}</td>
                    <td className="px-3 py-3.5 text-right"><PnLPill value={h.pnl} pct={h.pnlPct} /></td>
                    <td className="px-3 py-3.5 text-center"><StatusBadge status={h.status} /></td>
                    <td className="px-3 py-3.5 text-[12px] text-fg-muted max-w-[300px] leading-snug">{h.reason}</td>
                    <td className="px-3 py-3.5"><Tag tone="muted">{h.sector}</Tag></td>
                    <td className="px-3 py-3.5 text-fg-faint group-hover:text-fg"><Icon.ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Icon.Briefcase size={22} />}
            title="No holdings yet"
            body="Connect your Groww account to see live portfolio status."
            action={<Button variant="secondary" size="sm" icon={<Icon.Link2 size={14} />}>Connect Groww</Button>}
          />
        )}
      </Card>

      <p className="mt-5 text-[12px] text-fg-dim max-w-3xl leading-relaxed">
        <Icon.Info size={12} className="inline-block mr-1 -mt-0.5" />
        Action is computed locally from technical filters — decision support, not investment advice. No orders are placed.
      </p>
    </div>
  );
};

window.ScreenPortfolio = ScreenPortfolio;
