// Screen 4 — Stock Detail

const { Icon, fmt, Card, Button, IconChip, Tag, StatusBadge, IndicatorChip, indicatorTone, ScoreBar, PageHeader, SectionLabel } = window;
const { useState, useMemo, useRef } = React;

const RANGES = [
  { id: '1M', days: 21 },
  { id: '3M', days: 63 },
  { id: '6M', days: 126 },
  { id: '1Y', days: 252 },
  { id: '2Y', days: 252 },
  { id: '5Y', days: 252 },
];

// EMA20 over closes
const ema = (values, period) => {
  const k = 2 / (period + 1);
  const out = [];
  values.forEach((v, i) => {
    if (i === 0) out.push(v);
    else out.push(v * k + out[i - 1] * (1 - k));
  });
  return out;
};

// MACD: 12-26 EMA difference + 9-period signal
const macdLine = (closes) => {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macd = closes.map((_, i) => e12[i] - e26[i]);
  const signal = ema(macd, 9);
  const hist = macd.map((v, i) => v - signal[i]);
  return { macd, signal, hist };
};

// RSI 14
const rsi = (closes, period = 14) => {
  let gains = 0, losses = 0;
  const out = new Array(closes.length).fill(50);
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const g = Math.max(0, ch);
    const l = Math.max(0, -ch);
    if (i <= period) { gains += g; losses += l; out[i] = 50; continue; }
    if (i === period + 1) { gains /= period; losses /= period; }
    gains = (gains * (period - 1) + g) / period;
    losses = (losses * (period - 1) + l) / period;
    const rs = losses === 0 ? 100 : gains / losses;
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
};

// Candlestick chart
const CandlestickChart = ({ data, width = 800, height = 320, overlays }) => {
  const margin = { top: 10, right: 16, bottom: 24, left: 56 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const prices = data.flatMap((d) => [d.high, d.low]);
  const min = Math.min(...prices) * 0.99;
  const max = Math.max(...prices) * 1.01;
  const yScale = (v) => margin.top + h - ((v - min) / (max - min)) * h;
  const xStep = w / data.length;
  const candleW = Math.max(2, xStep * 0.65);

  // EMA20 path
  const closes = data.map((d) => d.close);
  const ema20 = ema(closes, 20);
  const emaPath = ema20.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep + xStep / 2},${yScale(v)}`).join(' ');

  // Y-axis ticks
  const ticks = 5;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (max - min) * (i / ticks));

  // X-axis labels — show 5 evenly spaced
  const xLabels = [0, 0.25, 0.5, 0.75, 0.99].map((p) => Math.floor(p * (data.length - 1)));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {/* grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={margin.left} x2={width - margin.right} y1={yScale(v)} y2={yScale(v)} stroke="#23232A" strokeDasharray="2 4" />
          <text x={margin.left - 8} y={yScale(v) + 3} textAnchor="end" fontSize="10.5" fill="#71717A" fontFamily="JetBrains Mono">{v.toFixed(0)}</text>
        </g>
      ))}

      {/* candles */}
      {data.map((d, i) => {
        const x = margin.left + i * xStep + xStep / 2;
        const up = d.close >= d.open;
        const color = up ? '#22D3A4' : '#F87171';
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={yScale(d.high)} y2={yScale(d.low)} stroke={color} strokeWidth="1" />
            <rect
              x={x - candleW / 2}
              y={yScale(Math.max(d.open, d.close))}
              width={candleW}
              height={Math.max(1, Math.abs(yScale(d.open) - yScale(d.close)))}
              fill={up ? 'rgba(34,211,164,0.85)' : 'rgba(248,113,113,0.85)'}
              stroke={color}
              strokeWidth="0.5"
            />
          </g>
        );
      })}

      {/* EMA20 overlay */}
      {overlays.ema20 && (
        <path d={emaPath} fill="none" stroke="#FBBF24" strokeWidth="1.5" />
      )}

      {/* x labels */}
      {xLabels.map((i, k) => {
        const x = margin.left + i * xStep + xStep / 2;
        const monthOffset = data.length - i;
        const date = new Date();
        date.setDate(date.getDate() - monthOffset);
        return (
          <text key={k} x={x} y={height - 6} fontSize="10.5" fill="#71717A" textAnchor="middle" fontFamily="JetBrains Mono">
            {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </text>
        );
      })}
    </svg>
  );
};

const MACDChart = ({ data, width = 800, height = 90 }) => {
  const margin = { top: 6, right: 16, bottom: 18, left: 56 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const closes = data.map((d) => d.close);
  const { macd, signal, hist } = macdLine(closes);
  const maxAbs = Math.max(...hist.map(Math.abs), ...macd.map(Math.abs)) * 1.1;
  const yScale = (v) => margin.top + h / 2 - (v / maxAbs) * (h / 2);
  const xStep = w / data.length;
  const macdPath = macd.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep + xStep / 2},${yScale(v)}`).join(' ');
  const sigPath = signal.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep + xStep / 2},${yScale(v)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <text x={margin.left - 8} y={margin.top + 10} fontSize="10" fill="#71717A" textAnchor="end" fontFamily="JetBrains Mono">MACD</text>
      <line x1={margin.left} x2={width - margin.right} y1={yScale(0)} y2={yScale(0)} stroke="#2D2D36" />
      {hist.map((v, i) => {
        const x = margin.left + i * xStep + xStep / 2;
        const color = v >= 0 ? 'rgba(34,211,164,0.6)' : 'rgba(248,113,113,0.6)';
        const yTop = v >= 0 ? yScale(v) : yScale(0);
        const yh = Math.abs(yScale(v) - yScale(0));
        return <rect key={i} x={x - xStep * 0.3} y={yTop} width={xStep * 0.6} height={Math.max(0.5, yh)} fill={color} />;
      })}
      <path d={macdPath} fill="none" stroke="#7DD3FC" strokeWidth="1.2" />
      <path d={sigPath} fill="none" stroke="#FBBF24" strokeWidth="1.2" />
    </svg>
  );
};

const RSIChart = ({ data, width = 800, height = 80 }) => {
  const margin = { top: 6, right: 16, bottom: 18, left: 56 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const closes = data.map((d) => d.close);
  const r = rsi(closes);
  const yScale = (v) => margin.top + h - (v / 100) * h;
  const xStep = w / data.length;
  const path = r.map((v, i) => `${i === 0 ? 'M' : 'L'} ${margin.left + i * xStep + xStep / 2},${yScale(v)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <text x={margin.left - 8} y={margin.top + 10} fontSize="10" fill="#71717A" textAnchor="end" fontFamily="JetBrains Mono">RSI 14</text>
      {/* Rally band 45-62 */}
      <rect x={margin.left} y={yScale(62)} width={w} height={yScale(45) - yScale(62)} fill="rgba(34,211,164,0.08)" />
      <line x1={margin.left} x2={width - margin.right} y1={yScale(62)} y2={yScale(62)} stroke="#22D3A4" strokeOpacity="0.4" strokeDasharray="2 3" />
      <line x1={margin.left} x2={width - margin.right} y1={yScale(45)} y2={yScale(45)} stroke="#22D3A4" strokeOpacity="0.4" strokeDasharray="2 3" />
      <line x1={margin.left} x2={width - margin.right} y1={yScale(70)} y2={yScale(70)} stroke="#F87171" strokeOpacity="0.4" strokeDasharray="2 3" />
      <line x1={margin.left} x2={width - margin.right} y1={yScale(30)} y2={yScale(30)} stroke="#F87171" strokeOpacity="0.4" strokeDasharray="2 3" />
      <text x={width - margin.right - 4} y={yScale(70) - 2} fontSize="9" fill="#F87171" textAnchor="end" fontFamily="JetBrains Mono">70</text>
      <text x={width - margin.right - 4} y={yScale(30) - 2} fontSize="9" fill="#F87171" textAnchor="end" fontFamily="JetBrains Mono">30</text>
      <path d={path} fill="none" stroke="#A78BFA" strokeWidth="1.4" />
    </svg>
  );
};

const ScreenStock = ({ ticker, data, navigate }) => {
  const [range, setRange] = useState('1Y');
  const [overlays, setOverlays] = useState({ ema20: true, macd: true, rsi: true });
  const [copied, setCopied] = useState(false);

  const stock = data.STOCKS.find((s) => s.ticker === ticker) || data.STOCKS[0];
  const sector = data.SECTORS.find((s) => s.id === stock.sectorId);

  const rangeDays = RANGES.find((r) => r.id === range).days;
  const ohlc = data.STOCK_OHLC.slice(-rangeDays);

  // Filter triggers — derive booleans from stock fields
  const triggers = [
    { label: 'MACD positive (> 0)', pass: stock.macd > 0, value: stock.macd.toFixed(2) },
    { label: 'RSI in rally band (45–62)', pass: stock.rsi >= 45 && stock.rsi <= 62, value: stock.rsi.toString() },
    { label: 'Price above EMA20', pass: stock.cmp > stock.ema20, value: `${fmt.num(stock.cmp)} > ${fmt.num(stock.ema20, 0)}` },
    { label: '52W gap ≥ -10%', pass: stock.gap52 >= -10, value: `${stock.gap52.toFixed(1)}%` },
    { label: 'Sector state ≠ Cold', pass: sector && sector.state !== 'cold', value: sector ? sector.state.toUpperCase() : '—' },
  ];

  const onCopy = () => {
    navigator.clipboard?.writeText(stock.ticker);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tilt-fade">
      {/* Back link */}
      <button onClick={() => navigate('scan')} className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg mb-4 transition-colors">
        <Icon.ArrowLeft size={14} />
        Back to Scan
      </button>

      {/* Header card */}
      <Card padding={false} className="mb-5">
        <div className="p-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="mono text-[34px] font-bold text-fg tracking-tight leading-none">{stock.ticker}</h1>
                <Tag tone="muted">NSE</Tag>
                <span className="text-[14px] text-fg-muted">{stock.name}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Tag tone="info">{stock.sector}</Tag>
                {sector && <StatusBadge status={sector.state} size="sm" />}
                <span className="text-[11.5px] text-fg-dim mono">sector mom {sector?.momentum.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="mono text-[40px] font-bold text-fg leading-none">{fmt.inr(stock.cmp)}</div>
              <div className={`mt-2 inline-flex items-center gap-1.5 mono text-[13px] font-semibold ${stock.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                {stock.change >= 0 ? <Icon.TrendingUp size={14} /> : <Icon.TrendingDown size={14} />}
                <span>{stock.change >= 0 ? '+' : ''}{(stock.cmp * stock.change / 100).toFixed(2)}</span>
                <span>({fmt.pct(stock.change)})</span>
                <span className="text-fg-dim font-normal">today</span>
              </div>
            </div>
          </div>

          {/* Composite score */}
          <div className="mt-6 flex items-end gap-6 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-fg-dim font-medium">Composite score</div>
              <div className={`mt-1 mono text-[32px] font-bold leading-none ${stock.score >= 0.75 ? 'text-bull' : stock.score >= 0.5 ? 'text-warn' : 'text-bear'}`}>
                {fmt.score(stock.score)}
              </div>
            </div>
            <div className="flex-1 min-w-[280px] max-w-[480px]">
              <ScoreBar parts={stock.scoreParts} width="100%" height={10} showLegend />
            </div>
          </div>

          {/* Action chips */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" icon={<Icon.Bookmark size={14} />}>Add to watchlist</Button>
            <Button variant="secondary" size="sm" icon={<Icon.ExternalLink size={14} />}>Open in Groww</Button>
            <Button variant="secondary" size="sm" icon={copied ? <Icon.Check size={14} /> : <Icon.Copy size={14} />} onClick={onCopy}>
              {copied ? 'Copied' : 'Copy ticker'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Chart + indicator panel */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Chart card */}
        <Card padding={false}>
          <div className="px-5 py-4 flex items-center justify-between border-b border-line-soft flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-fg">Price · 1Y OHLC</span>
              <span className="mono text-[11px] text-fg-dim">{ohlc.length} sessions</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Range selector */}
              <div className="inline-flex p-0.5 bg-ink-800 border border-line rounded-md">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRange(r.id)}
                    className={`h-7 px-2 text-[11.5px] mono font-medium rounded transition-colors ${
                      range === r.id ? 'bg-ink-500 text-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {r.id}
                  </button>
                ))}
              </div>
              {/* Overlay toggles */}
              <div className="inline-flex p-0.5 bg-ink-800 border border-line rounded-md ml-2">
                {[
                  { id: 'ema20', label: 'EMA20', color: '#FBBF24' },
                  { id: 'macd', label: 'MACD', color: '#7DD3FC' },
                  { id: 'rsi', label: 'RSI', color: '#A78BFA' },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOverlays((s) => ({ ...s, [o.id]: !s[o.id] }))}
                    className={`h-7 px-2 text-[11.5px] font-medium rounded inline-flex items-center gap-1.5 transition-colors ${
                      overlays[o.id] ? 'bg-ink-500 text-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ background: o.color, opacity: overlays[o.id] ? 1 : 0.4 }} />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="p-2">
            <CandlestickChart data={ohlc} overlays={overlays} />
            {overlays.macd && (
              <div className="border-t border-line-soft pt-1 mt-1">
                <MACDChart data={ohlc} />
              </div>
            )}
            {overlays.rsi && (
              <div className="border-t border-line-soft pt-1 mt-1">
                <RSIChart data={ohlc} />
              </div>
            )}
          </div>
        </Card>

        {/* Indicator panel */}
        <div className="space-y-5">
          <Card padding={false}>
            <div className="px-4 py-3 border-b border-line-soft text-[11px] uppercase tracking-wider text-fg-dim font-semibold">Indicators</div>
            <div className="p-4 space-y-3">
              {[
                { label: 'RSI 14', value: stock.rsi.toString(), tone: indicatorTone.rsi(stock.rsi), help: stock.rsi >= 45 && stock.rsi <= 62 ? 'Within rally band 45–62' : stock.rsi > 70 ? 'Overbought' : stock.rsi < 30 ? 'Oversold' : 'Outside rally band' },
                { label: 'MACD histogram', value: (stock.macd >= 0 ? '+' : '') + stock.macd.toFixed(2), tone: indicatorTone.macd(stock.macd), help: stock.macd > 0.2 ? 'Strong positive momentum' : stock.macd > 0 ? 'Mild positive' : 'Negative momentum' },
                { label: 'Price vs EMA20', value: stock.cmp > stock.ema20 ? `+${((stock.cmp/stock.ema20 - 1)*100).toFixed(2)}%` : `${((stock.cmp/stock.ema20 - 1)*100).toFixed(2)}%`, tone: indicatorTone.ema20(stock.cmp, stock.ema20), help: `EMA20 at ${fmt.num(stock.ema20, 0)}` },
                { label: '52-week gap', value: `${stock.gap52.toFixed(1)}%`, tone: indicatorTone.gap52(stock.gap52), help: stock.gap52 >= -10 && stock.gap52 <= -4 ? 'Inside value zone' : stock.gap52 > -4 ? 'Near 52w high' : 'Deep discount — value trap risk' },
              ].map((ind) => (
                <div key={ind.label} className="bg-ink-600 border border-line rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-fg-dim font-medium">{ind.label}</span>
                    <span className={`mono text-[16px] font-bold ${ind.tone === 'bull' ? 'text-bull' : ind.tone === 'warn' ? 'text-warn' : 'text-bear'}`}>{ind.value}</span>
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-fg-muted leading-snug">{ind.help}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding={false}>
            <div className="px-4 py-3 border-b border-line-soft text-[11px] uppercase tracking-wider text-fg-dim font-semibold">Filter triggers</div>
            <div className="py-2">
              {triggers.map((t) => (
                <div key={t.label} className="flex items-center justify-between px-4 py-2.5 border-b border-line-soft last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center ${t.pass ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'}`}>
                      {t.pass ? <Icon.Check size={12} /> : <Icon.X size={12} />}
                    </span>
                    <span className="text-[12.5px] text-fg">{t.label}</span>
                  </div>
                  <span className="mono text-[11.5px] text-fg-muted">{t.value}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-line-soft bg-ink-800/50">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-fg-muted">Conditions passing</span>
                <span className="mono text-[13px] font-semibold text-fg">{triggers.filter((t) => t.pass).length} / {triggers.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Backtest cameo */}
      <Card padding={false}>
        <div className="p-5 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon.History size={14} className="text-fg-muted" />
              <span className="text-[11px] uppercase tracking-wider text-fg-dim font-semibold">Backtest cameo</span>
            </div>
            <h3 className="text-[15.5px] font-semibold text-fg">How would {stock.ticker} have performed under the Rally filter?</h3>
            <p className="text-[12.5px] text-fg-muted mt-0.5">Backtested on this ticker's history alone, last 12 months.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="mono text-[20px] font-bold text-fg">7</div>
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Triggers</div>
            </div>
            <div className="text-right">
              <div className="mono text-[20px] font-bold text-bull">+6.4%</div>
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Avg 30d return</div>
            </div>
            <div className="text-right">
              <div className="mono text-[20px] font-bold text-bull">71%</div>
              <div className="text-[11px] uppercase tracking-wider text-fg-dim">Hit rate</div>
            </div>
            <Button variant="secondary" size="md" iconRight={<Icon.ArrowUpRight size={14} />} onClick={() => navigate('backtest')}>
              See full backtest
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

window.ScreenStock = ScreenStock;
