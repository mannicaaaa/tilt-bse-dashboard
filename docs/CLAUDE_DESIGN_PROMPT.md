# Claude Design prompt — Tilt dashboard

**Paste the block below into claude.ai/design.** It is self-contained and will produce a 5-screen dashboard ready to export to React + Tailwind. After Claude Design generates the screens, export them and pass the React components + the screen images back to your Claude Code session, which will wire the components to the live FastAPI endpoints.

**Tips before pasting:**

- Use "Opus 4.7" mode for design generation (default).
- Generate all 5 screens in a single design system so colors + typography stay consistent.
- After generation, ask Claude Design to "show me the design tokens" — saves time later when you ask Claude Code to wire components.

---

## THE PROMPT (paste from here)

I'm building **Tilt** — a market intelligence dashboard for Indian equities. I need you to design a 5-screen single-user web dashboard. Backend already exists as a FastAPI service; you're designing the frontend. The user is a retail investor (me) — single-user, no auth flows needed.

### Product context

Tilt scans the Nifty 500 across 14 NSE sectoral indices using technical filters (MACD momentum, RSI position, distance from 52-week high) and ranks stocks by a composite score. It also reads my live Groww brokerage holdings and tags each holding as Hold / Average-down / Sell based on the same filter logic. Everything is on-demand — the user hits Refresh, and the backend recomputes. Read-only; no order execution.

### Visual direction

- **Mode:** Dark mode primary, with a light-mode toggle in the top nav. Default dark.
- **Typography:** `Inter` for UI text. `JetBrains Mono` for ALL numeric values (prices, percentages, scores, indicator values). Numerics in monospace is non-negotiable — it's a financial product and tabular alignment matters.
- **Color palette (dark):**
  - Background: deep charcoal (`#0A0A0B` base, `#16161A` cards)
  - Foreground: warm white (`#F4F4F5`)
  - Accent: electric green (`#22D3A4`) for bullish / positive / "Hot"
  - Alert: soft red (`#F87171`) for bearish / negative / "Sell" / "Trap"
  - Warning: amber (`#FBBF24`) for neutral / caution / "Cold" sectors
  - Muted: gray scale 400/500/600 for secondary text + borders
- **Density:** Linear-/ Vercel-/ Bloomberg-Terminal-modern. Data-dense but breathable. Not Robinhood-friendly-fluffy; not Bloomberg-Terminal-overwhelming. Aim closer to **TradingView's pro dashboard** or **Vercel's project dashboard**.
- **Iconography:** Lucide icons throughout. Outline style, 1.5px stroke, sized 16/20/24.
- **Spacing:** 4/8/12/16/24/32/48 scale. Cards have `border-radius: 12px`. Inner padding `24px`.
- **Motion:** subtle — fade-in on data refresh, ~150ms transitions. No hero animations.
- **Inspiration references:** TradingView's pro dashboard, Vercel's project dashboard, Linear's issues view, Groww's stock detail page (but darker + denser).

### Global layout (applies to all screens)

- **Left sidebar (collapsed by default, 56px wide; expand on hover to 240px):** vertical icon nav with 5 destinations — Dashboard, Portfolio, Scan, Backtest, Settings. Active item has the accent green left-border 2px.
- **Top bar (56px tall):** Tilt logo top-left, a global "Refresh data" button top-right (with a small timestamp like "Updated 2 min ago"), and a theme toggle. Refresh button shows a loading spinner inline when refresh is in flight.
- **Content area:** max-width 1440px, centered, with 32px horizontal padding.

### Reusable components needed

Design these as primitives so every screen reuses them:

1. **StockRow** — single horizontal row showing: ticker (mono-bold), name (small muted), CMP (mono right-aligned), score (mono right-aligned, color-graded), 4 indicator chips (RSI, MACD, EMA20, 52w gap), sector tag (small pill), and an action chevron. Hover state shows a subtle background highlight + cursor pointer (click → Stock Detail).
2. **SectorTile** — square tile with: sector name, sector index value, momentum score (large mono), Hot/Neutral/Cold tag (colored pill top-right), count of passing stocks below. Tile background subtly tinted by sector state (green wash for Hot, gray for Neutral, amber wash for Cold). Hover lifts the tile 2px.
3. **IndicatorChip** — small pill showing a single indicator: label (RSI), value (mono), and a tiny inline indicator of "in band / out of band" (green dot / red dot / amber dot).
4. **ScoreBar** — horizontal bar showing the 4 components of the composite score (momentum, upside, RSI, sector) stacked, each colored with the component's contribution. Tooltip on hover shows exact numerics.
5. **StatusBadge** — pill: Hold (green outlined) / Average (amber filled) / Sell (red filled) / Hot (green filled) / Cold (amber outlined).
6. **EmptyState** — used when a scan returns 0 stocks, e.g. "No rally signals today" — small icon, headline, soft body copy.

### The 5 screens

#### Screen 1 — Dashboard (home / `/`)

The morning summary. The single most important screen. Layout top to bottom:

- **Hero strip (full width, ~120px tall):** "Today's Conviction Picks" headline + subhead "Stocks passing the Rally filter inside currently-Hot sectors." On the right of the hero, a big "Refresh data" CTA (primary button) with the last-refreshed timestamp. If user just refreshed, show a one-line stat: "Refreshed in 3.2s · 47 tickers updated · 12 cache hits".
- **Conviction picks grid:** 5 StockRow components stacked vertically inside a single card. Each row has all 4 indicator chips visible + the ScoreBar inline on the right. Click → Stock Detail. If fewer than 5 results, show EmptyState card explaining "Today's market has no signals matching all four filters — sector rotation overlay is showing X hot sectors, but none have rally candidates."
- **Sector heatmap section (below conviction picks):** Section title "Sector Strength" + a 14-tile grid (4 columns × 4 rows, with two empty cells in the last row). Each tile is a SectorTile. Sorted by sector momentum score, hottest first. Below the grid, a small footnote: "Overlapping indices intentional — Banking trio (Bank/Private/PSU) and Pharma/Healthcare are different lenses on the same theme."
- **Quick stats strip (footer of screen):** 4 inline stat cards — "Holdings tagged Hold: N · Average: N · Sell: N · Last backtest run: <date>". Each clickable, navigates to the relevant screen.

#### Screen 2 — Portfolio (`/portfolio`)

Lists my Groww holdings with action recommendations. Layout:

- **Page header:** "Portfolio" + subhead "N holdings · ₹X total invested · Last sync 2 min ago." A "Sync from Groww" button on the right.
- **Tab bar:** All / Hold / Average / Sell — with a count badge next to each.
- **Holdings table (the main surface):** columns — Ticker, Name, Qty, Avg Buy Price, CMP, P&L (₹ and %), Status (StatusBadge), Reason (one-line explanation, muted), action chevron. Sorted by Sell first, then Average, then Hold. Each row is clickable → Stock Detail. P&L numbers colored green/red.
- **Empty state:** if no Groww credentials configured, show a friendly setup card: "Connect your Groww account to see live portfolio status" with a "Set up" CTA.
- **Note (small, bottom of screen, muted text):** "Status is computed locally from technical filters — this is decision support, not investment advice. No orders are placed."

#### Screen 3 — Scan (`/scan`)

The full rally scanner, more detail than the dashboard's Top 5. Layout:

- **Page header:** "Rally Scanner" + subhead "Stocks across the Nifty 500 passing momentum + value-gap filters."
- **Filter chip row:** sector-strength toggle (All / Hot only / Hot + Neutral / Cold), composite score minimum slider (default 0.5), result count chip ("Showing N of M"). Filters update results live, no apply button.
- **Result table:** same StockRow component as Dashboard, but with more columns expanded — explicit RSI value, MACD histogram value, EMA20 value, % below 52w high, score, sector, sector tag. Sortable by every numeric column. Default sort: composite score descending. Click row → Stock Detail.
- **Sector group view toggle:** a button in the top-right of the table to switch between "Flat list" and "Group by sector" view. Group by sector renders one collapsible section per sector with its Top 5.

#### Screen 4 — Stock Detail (`/stock/:ticker`)

Drill-down for a single stock. Layout:

- **Header card:** ticker (large mono), name, CMP (huge), today's change (colored), sector + sector tag, composite score with ScoreBar component shown big and clearly. Three action chips at the bottom of the header: "Add to watchlist" (placeholder), "Open in Groww" (link), "Copy ticker".
- **Chart card (main visual surface):** 1-year OHLCV candlestick chart with three overlays toggleable in the top-right of the card — EMA20, MACD (subchart below price), RSI (subchart below MACD). Chart library: recharts or tradingview-lite — Claude Design should mock the chart visually but not implement the lib. Date range selector: 1M / 3M / 6M / 1Y / 2Y / 5Y.
- **Indicators panel (right side of chart):** sticky panel listing all 4 IndicatorChips at large size with current values + interpretation ("RSI 58 — within rally band 45–62"). Below that, "Filter triggers" — a list of which conditions this stock currently satisfies (with green check or red x), so the user can see exactly why this stock is or isn't a rally candidate.
- **Backtest cameo (bottom of screen, optional card):** "How would this stock have performed under the Rally filter?" — small inline backtest result showing trigger count + avg 30d forward return for THIS ticker alone. Click → opens the full backtest screen pre-filtered.

#### Screen 5 — Backtest (`/backtest`)

Validates the Rally filter against history. Layout:

- **Page header:** "Backtest Results" + subhead "Rally filter performance on Nifty 500, past 12 months."
- **Run controls card:** date range pickers (start, end, defaults to past 1y), "Run backtest" CTA (primary). Shows last-run timestamp + duration. Note in muted text: "Uses today's index constituents — survivorship bias disclosed in README."
- **Headline metrics card (4 big stat tiles in a row):**
  - Total triggers: count, huge mono
  - 30-day hit rate: % positive at +30d, colored green if >50%
  - Avg forward return: % with color coding
  - Max drawdown per signal: % in red
- **Time-series chart card:** cumulative return of "buy every rally signal, hold 30 days, sell" strategy vs Nifty 50 buy-and-hold benchmark. Two-line chart.
- **Signal-by-signal table (bottom, collapsible by default):** every individual trigger — date, ticker, sector, +5d / +15d / +30d return, status (winner/loser/flat). Sortable. Lets the interviewer drill into specific events if they want.

### Final notes for Claude Design

- Generate all 5 screens in a single Figma-style frame so the design system stays consistent across screens.
- Export the React + Tailwind code with the design tokens broken out into a shared `tokens.ts` file. The downstream Claude Code session will consume that file when wiring components to FastAPI.
- Where you need placeholder data (numeric values, tickers, etc.), use plausible real Indian-equity examples — Tata Power, Reliance, HDFC Bank, Infosys, Sun Pharma, etc. Don't use `Lorem` or `XYZ Corp` placeholders.
- Skip a login screen, skip an onboarding flow, skip a settings page beyond what's hinted in the sidebar. Single-user, single-session, single-purpose.

When done, ship me: (a) the 5 screen images as PNGs, (b) the React + Tailwind component code as a downloadable bundle, and (c) the design tokens file. I'll wire it into the live FastAPI backend in a follow-up Claude Code session.
