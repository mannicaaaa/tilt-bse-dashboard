# Tilt — Lanes Explained (Interview Cheat-Sheet)

The dashboard surfaces stock recommendations across **four lanes**. Each lane has a different thesis. Same stock universe, same indicator math, different filter logic. Plain English below — say it this way in the interview.

---

## Core principle

Every recommendation is **defensible by numbers**. No LLM is in the loop — the math computes the filters, the math generates the pros & cons text. If a stock appears in a lane, it's because specific conditions on RSI, MACD, EMA20, and 52-week-high distance all evaluated true on real OHLCV data from yfinance. The user can audit every claim against any charting tool.

---

## Lane 1 — Strong (green accent)

> *"The cleanest possible entry. All four conditions firing at once."*

**Plain English:** This stock is in an uptrend (price above the 20-day average), the momentum just turned (MACD crossover in the last 3 days), it's not overbought yet (RSI sitting between 45 and 62), and it still has room to climb back to its yearly high (currently 15%+ below the 52-week peak).

**Why these 4 conditions specifically:**
- **MACD crossover within 3 bars** → catches the *turn*, not a stale trend. Don't enter a move that's already weeks old.
- **Close > EMA20** → confirms the turn is real and price has held the short-term average. Filters out failed breakouts.
- **RSI 45–62** → the sweet spot. Below 45 means the stock isn't really moving up yet. Above 62 means the move is already late.
- **≥ 15% below 52-week high** → there's still meaningful upside to recover. Avoids entries at all-time highs.

**When this lane is empty:** the market is either in a corrective phase (no MACD crossovers happening) OR everything is overbought (RSI > 62 across the board) OR everything is too close to its 52-week high. Any one of these breaks Strong.

---

## Lane 2 — Momentum (blue accent)

> *"Already running. Late entry, but the move is real."*

**Plain English:** This stock is moving up right now — MACD histogram is positive, price is above its 20-day average, RSI is above 50. The entry is later than Strong (less cushion if it reverses), but you're piling onto an existing winner.

**Why these 3 conditions specifically:**
- **MACD histogram positive** → the momentum is currently active, not just *about* to start.
- **Close > EMA20** → trend confirmation, same as Strong.
- **RSI ≥ 50** → above neutral, indicates buying pressure has the upper hand.

**Key difference from Strong:** no requirement on RSI ceiling (could be 70 = overbought) and no requirement on 52w gap (could be near highs). Trades safety for catching extended trends.

**When this lane is empty:** market-wide breakdown. If most stocks are below their EMA20 or have negative MACD, momentum dries up. This is what a real correction looks like.

---

## Lane 3 — Value (amber accent)

> *"Beaten down. Contrarian. Could bounce."*

**Plain English:** This stock is oversold (RSI below 35) and trading at least 10% below its 52-week high. The trend hasn't turned yet, but the discount is real. It's a longer-hold bet — buy now, expect a bounce in weeks-to-months.

**Why these 2 conditions specifically:**
- **RSI < 35** → classic oversold zone. Selling has been heavy enough that mean reversion becomes statistically likely.
- **≥ 10% below 52-week high** → ensures it's not just a small dip in an uptrending stock. We want stocks that have genuinely fallen.

**Why looser 52w gap than Strong (10% vs 15%):** Value stocks often haven't fallen *as* much as Strong-candidates need to recover to. The bias is "oversold and discounted enough" — not "deeply punished."

**When this lane is empty:** market is in risk-on mode. If less than 5% of stocks have RSI below 35, almost nothing is oversold today. Common during strong bull runs.

---

## Lane 4 — Smart Money is Buying (purple accent)

> *"Top mutual funds hold this. Funds did the fundamental work; we add the technical check."*

**Plain English:** This stock appears in at least one of the top Indian mutual funds we track (loaded from `data/mutual_fund_holdings.csv`, refreshed monthly from public AMC factsheets). The funds have done their fundamental analysis. We filter to only show MF holdings that also pass at least one loose technical condition — so you're not buying just because a fund bought, you're buying because the technical entry isn't actively bad.

**Why this lane is uniquely valuable:**
- MFs sit on far more research firepower than retail. If 3+ funds hold a stock, that's a fundamental conviction signal you couldn't replicate alone.
- But MFs are slow to exit — they may be holding at the wrong time technically. The technical sanity check filters that out.
- **Result:** fundamental conviction + technical reasonableness. Two independent signals agreeing.

**Loose technical check** (any one fires):
- MACD histogram positive (some momentum), OR
- RSI below 35 (oversold; MF is averaging), OR
- 10%+ below 52-week high (discount intact)

**When this lane is empty:** MF-held stocks today are EITHER passing the stricter Strong/Momentum/Value lanes (they appear there instead — strict beats loose in lane assignment) OR they're all in technically awful spots (negative MACD, RSI in 35-50 limbo, near 52w highs). Both reasons get explained in the dashboard's empty-state text.

**Disclosure:** there's no free/public API for Indian MF portfolio holdings. The CSV is a monthly-refresh manual snapshot from AMC factsheets. Production upgrade path: paid aggregator (Tickertape, ValueResearch) behind the same `MFHoldingsProvider` interface. This pattern matches how we already handle `MarketDataProvider` (yfinance) and `PortfolioProvider` (mock → Groww).

---

## Composite score (every card carries one)

Each card shows a **composite score** in [0, 1] computed from four components, weighted per the SPEC:

`score = 0.35 × momentum + 0.25 × upside + 0.20 × rsi + 0.20 × sector`

Each component normalized to [0, 1]:

- **momentum** (0.35) — MACD histogram divided by 1% of current price, clipped. Stocks with histogram ≥ 1% of price max this out.
- **upside** (0.25) — Distance below 52-week high divided by 30%. A stock 30%+ below its high maxes this out.
- **rsi** (0.20) — Triangle peaked at 53.5 (midpoint of the rally band 45–62), drops to 0 at the edges. Rewards the sweet spot.
- **sector** (0.20) — Comes from the sector-rotation overlay: average momentum of all constituents in the stock's strongest sector. Passes through directly.

The score is shown as both a single number AND a four-segment bar so the user can see *which component* is driving the score. This is the "no black box" surface — every recommendation shows its work.

---

## How lanes interact with each other

A stock can only be in **one** lane at a time. Priority (highest wins):

1. **Strong** beats everything — if 4 conditions fire, it's strong, full stop.
2. **Momentum** if Strong didn't catch it.
3. **Value** if Momentum didn't.
4. **Smart Money** as the fallback — if a fund holds the stock and at least one loose condition fires.

A "Smart Money + Strong" stock appears in **Strong only** (the strict lane wins). But the MF info is still surfaced as a *pro* line on the card: *"Held by N tracked MFs."* So you never lose the smart-money context, you just don't get duplicate listings.

---

## Why-is-this-lane-empty explanations

When a lane returns zero picks, the dashboard tells you *why* using real universe-wide stats. Examples:

- **Strong empty:** *"Strong needs all 4 conditions to fire. Only 8% of stocks had a MACD crossover in the last 3 days; also, 73% of stocks have RSI > 62 (overbought — the entry band is 45-62)."*
- **Momentum empty:** *"Momentum needs all 3 conditions. Only 22% of stocks have positive MACD histogram (market in a corrective phase)."*
- **Value empty:** *"Only 1.3% of stocks have RSI < 35 today — the market hasn't capitulated, so almost nothing is oversold enough to qualify as Value."*
- **Smart Money empty:** *"Tracked MFs hold 23 stocks, but today they're either passing the stricter Strong/Momentum/Value lanes (so they appear there instead), or they're all failing the loose check."*

These reasons are generated by `tilt/api/diagnostics.py` from the actual universe distribution — they're not hardcoded templates. Same as the pros/cons on cards: defensible by real numbers.

---

## How this plays in the interview

The dominant question they'll likely ask: *"You're not just wrapping an LLM, right? Why these filters and not 'ask Gemini'?"*

The answer:

> *"LLMs don't have real-time prices. They can't actually compute RSI today. They hallucinate or refuse. So I grounded the recommendation logic in deterministic technical math — the four-lane filter design — and used the LLM-style pattern (pros/cons, narrative) by deriving the language directly from the same indicator values. Every claim on every card maps back to a number that any charting tool can verify."*

The dominant question on the Smart Money lane: *"How do you get Indian MF holdings — there's no API."*

The answer:

> *"There isn't. SEBI mandates monthly disclosure, each AMC publishes a PDF factsheet — that's the only source. I built a CSV-based loader with a monthly manual refresh; the architecture has a clean upgrade path to a paid aggregator (Tickertape) when production-ready. Same provider pattern I used for portfolio (mock → Groww) and market data (yfinance → bhavcopy fallback)."*
