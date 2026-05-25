# Claude Design prompt — Tilt v3

**Paste the block below into claude.ai/design.** Builds on v2 (we keep the dark theme, Inter + JetBrains Mono, lane accents). The change is the **frame**: a daily brief, not a screener grid.

After Claude Design generates the new bundle, drop it into `~/tilt/frontend/` (overwrite existing files). I'll wire the components to the live FastAPI backend in a follow-up.

---

## THE PROMPT (paste from here)

I'm iterating on **Tilt** — a daily equity brief for Indian markets. The current design (v2) is a grid of stock cards across 4 strategy lanes (Strong / Momentum / Value / Smart Money). It works but reads like a screener. I want v3 to feel like a **published daily brief** — Stratechery for Indian equities, but with the technical math visible behind every claim.

### What's changing

The dashboard is no longer a grid-first design. It's a **scrollable brief** with this structure, top to bottom:

1. **Market read paragraph** — 2-3 sentences, AI-generated, summarizing today's market regime. Example: *"Indian markets opened in a corrective phase today. The Value lane is broad at 23 candidates while only 1 stock cleared the strict Strong filter — capital is rotating into oversold quality, not chasing momentum. IT sector strongest by relative momentum."*
2. **Hero pick** — one big card, takes up ~40% of viewport. The highest-conviction recommendation of the day. Lead with thesis paragraph, not indicators.
3. **Supporting picks** — 4-6 cards in a list (not a grid), one per row, scannable. Each with a one-line LLM thesis.
4. **Sector strip** — horizontal 14-bar visualization showing all sector momentums. Replaces the tiny "Sector backdrop" pill from v2.
5. **Portfolio sidebar** — persistent right rail showing holdings, P&L, today's recommended actions. Always visible, not hidden behind a tab.

### Product context (carries over from v2)

- Single-user retail investor (me). Read-only — no order execution.
- Backend exists as FastAPI; you're designing the frontend. Real data flows in via API.
- 4 lane categories: Strong (clean entry), Momentum (already moving), Value (oversold contrarian), Smart Money (held by tracked mutual funds + sane technicals).
- The technical math is real and verified (RSI, MACD, EMA20, 52w distance). The new LLM layer writes plain-English thesis paragraphs grounded on those numbers.

### The hero card — design carefully

This is the most-viewed component of the product. Built around the structure:

```
┌──────────────────────────────────────────────────────────────┐
│  TODAY'S TOP CONVICTION                          [SMART MONEY] │ ← lane tag
│                                                                │
│  PERSISTENT SYSTEMS                                            │
│  ₹4,892.30      +1.84%        Composite 0.78                   │
│                                                                │
│  THESIS                                                        │
│  Persistent Systems is showing a clean technical setup —       │
│  MACD turned positive 8 days ago, price has held above its     │
│  20-day moving average, and RSI at 56 sits in the entry        │
│  sweet spot with room to run. Held by HDFC Pharma & Health     │
│  Care fund, adding fundamental conviction to the technical     │
│  signal. The IT sector backdrop is the strongest today by      │
│  constituent momentum, providing tailwind.                     │
│                                                                │
│  WHY THIS, NOT OTHERS                                          │
│  Of 93 stocks scanned, only 1 cleared all 4 Strong-lane        │
│  conditions today.                                             │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Score: 0.78  ▓▓▓▓▓▓▓▓▓░░░░░                            │  │
│  │   momentum 0.31 ▓  upside 0.19 ▓  rsi 0.15 ▓  sector 0.13 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  KEY SIGNALS               RISK FACTORS                        │
│  ✓ MACD crossed +8d ago    ✗ Sector momentum Neutral           │
│  ✓ Above EMA20 by 4.2%     ✗ Volume below 30d avg              │
│  ✓ RSI 56 in 40-68 band                                        │
│  ✓ 11% below 52-week high                                      │
│                                                                │
│  [ View full chart & indicators → ]    Held by 1 tracked MF    │
└──────────────────────────────────────────────────────────────┘
```

**Hero card design rules:**
- ~720px wide on desktop. Padding 32px. Border-radius 16px.
- Lane tag pill in top-right, colored by lane accent (Strong=green, Momentum=blue, Value=amber, Smart Money=purple).
- Ticker is large mono (40px+). Company name in regular weight below.
- Price + change + composite score on one row, all mono numerics, large.
- **Thesis section** is the centerpiece. Inter sans-serif. 14-15px. ~5-7 lines. Reads like a paragraph from a research note.
- **"Why this, not others"** is a single italic line explaining the *exclusivity* of this pick. AI-generated.
- ScoreBar with the 4-component breakdown, hover for exact numerics.
- Pros (✓) and Cons (✗) in two columns, terse — 3-4 each.
- CTA button at bottom + a tiny "Held by N tracked MFs" badge when applicable.

### The market-read tile (above the hero)

```
┌──────────────────────────────────────────────────────────────┐
│ MARKET READ · 27 March 2026                                  │
│                                                              │
│ Indian markets opened in a corrective phase today. The       │
│ Value lane is broad at 23 candidates while only 1 stock      │
│ cleared the strict Strong filter — capital is rotating into  │
│ oversold quality, not chasing momentum. IT and Pharma are    │
│ the strongest sectors by relative momentum.                  │
│                                                              │
│ Scanned 93 tickers · 34 picks across 4 strategies            │
└──────────────────────────────────────────────────────────────┘
```

- Full-width, subtle bg-ink-800 background, no border.
- Title is small uppercase mono with the snapshot date.
- 2-3 sentence paragraph. Inter sans, 15-16px, comfortable line-height.
- Footer line with scan stats in mono.

### Supporting picks list (below the hero)

A vertical list of 4-6 picks (NOT a 3-column grid). Each row is one "supporting pick" card, ~80-100px tall, takes full width:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [STRONG]  TCS — Tata Consultancy Services      ₹3,812.40  +0.94%    0.74   ✓│
│ MACD just turned positive after 2 weeks of base-building.                     │
│ Held by ICICI Pru Bluechip · Mirae Large Cap                                 │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│ [VALUE]   INFY — Infosys                       ₹1,480.20  −1.42%    0.62   ✓│
│ Oversold (RSI 32) with 16.8% discount to 52-week high.                       │
│ Held by Parag Parikh Flexi · HDFC Flexi Cap                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Lane tag pill on the left (small, color by lane).
- Ticker + name in one line.
- Price + change + score in mono, right-aligned.
- One-sentence thesis below (AI-generated).
- MF holdings if any, small muted text.
- Click → opens stock detail.
- Hover state: subtle bg lift.

### Sector strip (after supporting picks)

Replaces the v2 sector backdrop pill. Full-width horizontal:

```
SECTOR ROTATION
[━━━━━━ Nifty IT 0.78 HOT] [━ Nifty Cons 0.11 hot] [━ Realty 0.06 hot] ...
```

- Each bar is sized proportional to its momentum.
- Color by Hot/Neutral/Cold state.
- Label inline if there's room, else truncated.
- Click bar to filter picks by that sector.

### Portfolio sidebar (right rail, always visible)

300px wide right rail, sticky on scroll:

```
PORTFOLIO
₹4.2L invested · ₹3.8L current · −₹40k

HOLDINGS (9)
  RELIANCE      +12.4%  HOLD
  HDFCBANK      +3.2%   HOLD
  INFY          −8.6%   AVERAGE
  ITC           +18.2%  HOLD
  TATAPOWER     −4.1%   AVERAGE
  ...
  
TODAY'S ACTIONS
2 holdings flagged for averaging:
  INFY · TATAPOWER
```

- Compact, dense, mono-numeric throughout.
- Action items at the bottom catch attention.
- "Connect Groww" CTA at the very bottom (greyed/muted).

### Visual direction (carry over from v2, unchanged)

- Dark mode default. Light toggle.
- Inter for UI text. **JetBrains Mono for every numeric**.
- Palette: bg `#0A0A0B` / cards `#16161A` / fg `#F4F4F5`.
- Lane accents: Strong `#22D3A4`, Momentum `#7DD3FC`, Value `#FBBF24`, Smart Money `#A78BFA`.
- Cards `border-radius: 12px`, padding `24px`.
- Lucide icons throughout.
- Density: feels like a published brief, not a Bloomberg terminal. Breathing room around the hero. Tighter on the list.

### Critical UI primitives to design

1. **HeroPick** — the big top card. Most-viewed component.
2. **MarketRead** — paragraph tile.
3. **SupportingPickRow** — full-width row with thesis.
4. **SectorStrip** — horizontal bar viz.
5. **PortfolioSidebar** — sticky right rail.
6. **LaneTag** — small pill (Strong / Momentum / Value / Smart Money) reused everywhere.

### What to keep from v2

- Stock detail page (`/stock/:ticker`) — unchanged.
- Portfolio page (`/portfolio`) — unchanged, just promoted to a sidebar too.
- Color palette + typography.

### What to remove from v2

- 4-lane collapsible sections on the home page — gone. Replaced by hero + supporting list.
- Mutual funds section (top) — folded into the picks themselves as "Held by..." metadata.
- Sector backdrop pill — promoted to the full sector strip.

### Data shape the frontend will consume

```jsonc
{
  "snapshot_date": "2026-03-27",
  "market_read": "Indian markets opened in a corrective phase today...",
  "scan_stats": { "tickers_scanned": 93, "total_picks": 34, "lane_counts": {...} },
  "hero": {
    "ticker": "PERSISTENT", "name": "Persistent Systems",
    "lane": "smart_money", "cmp": 4892.30, "score": 0.78,
    "thesis": "Persistent Systems is showing a clean technical setup...",
    "why_this": "Of 93 stocks scanned, only 1 cleared all 4 Strong conditions today.",
    "indicators": {...}, "score_breakdown": {...},
    "pros": [...], "cons": [...],
    "mf_context": {...}
  },
  "supporting": [
    { "ticker": "TCS", "thesis_short": "MACD just turned positive...", ... },
    ...
  ],
  "sectors": [ { "name": "Nifty IT", "momentum": 0.78, "state": "hot", ... }, ... ],
  "portfolio": { "total_invested": 420000, "current_value": 380000, "holdings": [...] }
}
```

### Deliverables

- 1 home screen mock (mobile + desktop).
- Stock detail screen (unchanged from v2 — include for completeness).
- React + Tailwind component bundle, no build step (UMD React + Babel-in-browser style).
- Real Indian-equity tickers + plausible thesis text in the mocks (PERSISTENT, TCS, INFY, RELIANCE, HDFCBANK, ITC, TATAPOWER, SUNPHARMA, etc).

When done, ship me: (a) the screen images, (b) the React component code as a downloadable zip, (c) any new design tokens. I'll wire it to live FastAPI in a follow-up.
