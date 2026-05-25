---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'Portfolio & Market Intelligence Tool — personal stock-analysis dashboard for interview project'
session_goals: 'Resolve open design questions on PRD v2: position-sizing rule, backtesting approach, run cadence (EOD vs intraday), interview narrative framing, scoring formula for top-5-per-sector, sectoral-index curation; generate orthogonal ideas across product, UX, technical, and narrative axes'
selected_approach: ''
techniques_used: []
ideas_generated: []
context_file: ''
out_of_repo_project: true
---

# Brainstorming Session Results

**Facilitator:** Rob
**Date:** 2026-05-25

## Session Overview

**Topic:** Portfolio & Market Intelligence Tool — a personal stock-analysis dashboard Rob is building as an interview portfolio project. PRD v2 agreed:

- Groww API for live holdings, cash, T1/pledged metadata
- Universe: Nifty 500 + 15 NSE sectoral indices (constituents via NSE CSVs)
- Rally filter (MACD crossover within 3d + EMA20 + RSI 45–62 + 15% below 52w high)
- Averaging filter (CMP < avg buy + RSI < 35 + MACD histogram rising)
- Trap filter (RSI > 70 OR within 2% of 52w high)
- **Sector-rotation overlay:** rank 15 sectoral indices by their own momentum; surface "Top 5 in Hot sectors" as the highest-conviction list
- Outputs: Morning Summary, Sector Heatmap, Portfolio Status (Hold/Average/Sell), Cash Allocation

**Goals:**

- Resolve open design questions (sizing rule, backtest approach, cadence, scoring, sector curation, interview framing)
- Generate 100+ orthogonal ideas across product / UX / technical / narrative / risk axes
- Land on a sharp interview story — what makes this project memorable vs "another stock screener"

### Session Setup

- **Out-of-repo project:** Personal project, lives outside mononest. Codebase-grounding phase replaced by external-assumption verification (Groww API, NSE data, indicator libs).
- **Format:** Q&A in 5 waves (scope → data/infra → logic → UX → narrative). Locked decisions written to this file as we go. No 100-idea divergence — user wants efficient design lock then implementation.

## Wave 1 — Interview framing + scope (LOCKED)

**Critical reframe:** Role is **AI PM at inflexion.io**. The artifact being evaluated is _AI-tooling craft using Claude Code_, NOT financial alpha. Project shape optimized accordingly.

| Decision        | Value                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Role            | AI PM @ inflexion.io                                                                                  |
| Build time      | 60–90 min, quality over speed                                                                         |
| Backend stack   | **Python + FastAPI** (not Streamlit — frontend will be Figma-driven, needs HTTP endpoints to wire to) |
| Frontend        | Separate React/Next built later from Rob's Figma; consumes FastAPI endpoints                          |
| Submission      | GitHub repo (public) + deployed live URL + short Loom showing Claude Code workflow                    |
| User model      | Single-user. Token in `.env`. No auth, no multi-tenancy.                                              |
| Trade execution | **Read-only / advisory.** No order placement.                                                         |
| Narrative axis  | **AI-tooling craft**, not financial alpha. Backtest validates claims, doesn't try to impress quants.  |

### AI-tooling artifacts to engineer into the build (interview signal)

- Well-structured `CLAUDE.md` with project rules, conventions, do/don't
- Decomposed sub-agents: `data-fetcher`, `signal-engine`, `backtest-runner`, `report-builder`
- Slash commands: `/morning-summary`, `/scan-sectors`, `/backtest <filter>`, `/portfolio-status`
- Conversation/decision log (this file is one such artifact)
- (Stretch) MCP server wrapping Groww API — high-leverage AIPM flex if time permits

## Wave 2 — Data + infrastructure (LOCKED)

| #                     | Decision                                                                                                            | Value |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| Groww API             | **Buy at deploy-time, not build-time.** Build uses mock holdings JSON; swap to live Groww as last step before Loom. |
| OHLCV primary         | yfinance / yahooquery                                                                                               |
| OHLCV fallback        | NSE bhavcopy adapter (built behind a `MarketDataProvider` interface — interview-readable architectural pattern)     |
| Run cadence           | **On-demand refresh button only.** No cron, no scheduler, no polling.                                               |
| Storage — state       | SQLite (portfolio snapshots, computed signal runs, audit log)                                                       |
| Storage — OHLCV cache | Parquet files keyed by ticker+date range                                                                            |
| Indicator library     | TBD Wave 3 (pandas-ta most likely)                                                                                  |
| Hosting (backend)     | Render free tier. Pre-warm with manual ping 1–2 min before sharing link.                                            |
| Demo backup           | ngrok tunnel only if Render fails live                                                                              |
| Hosting (frontend)    | Vercel — wired up later from Figma export                                                                           |
| Secrets               | `.env` locally + Render env vars in prod                                                                            |

**Why NOT ngrok for the primary demo link:** free tier shows clickthrough warning page to external visitors (unprofessional in Google Meet share), requires laptop on + network stable, URL rotates on restart. Render gives stable URL with no warning page; cold-start mitigated by pre-warming.

## Wave 3 — Logic + math (LOCKED)

| #                       | Decision                                                                                                                                                                                                                                                   | Value |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Position sizing         | **DROPPED.** App surfaces stocks only. No rupee amounts, no cash allocation. "Cash Allocation" module removed from PRD outputs.                                                                                                                            |
| Composite ranking score | `0.35 × momentum_strength + 0.25 × upside_room + 0.20 × rsi_sweet_spot + 0.20 × sector_strength`. Each component normalized [0,1]. Used for ranking only.                                                                                                  |
| Backtest                | **Lightweight.** Rally filter against past 1y Nifty 500. Metrics: trigger count, avg 30d forward return, hit rate (% positive at +30d), max drawdown per signal. Spun out as `backtest-runner` sub-agent for parallel filter-variant runs (AIPM artifact). |
| Indicator library       | **pandas-ta** primary, + **custom RSI + MACD implementations** under `indicators/` with pytest unit-tests comparing against pandas-ta output (signature interview artifact: "I verified the math from spec, not just trust the library").                  |
| Universe correctness    | Today's Nifty 500 constituents across full backtest window, **with explicit disclosure of survivorship + lookahead bias** in README + Loom narrative.                                                                                                      |

### The 14 sectoral indices (Nifty Media dropped)

| #   | NSE Index                | Notes                                                          |
| --- | ------------------------ | -------------------------------------------------------------- |
| 1   | Nifty Bank               | Big-12 banks (private + PSU mixed)                             |
| 2   | Nifty Private Bank       | Private banks only — overlaps with Bank                        |
| 3   | Nifty PSU Bank           | Public-sector banks only — overlaps with Bank                  |
| 4   | Nifty Financial Services | Banks + NBFCs + insurance                                      |
| 5   | Nifty IT                 | Big-10 IT services                                             |
| 6   | Nifty Pharma             | Pure-play pharma                                               |
| 7   | Nifty Healthcare Index   | Pharma + hospitals + diagnostics — partial overlap with Pharma |
| 8   | Nifty Auto               | OEMs + auto-ancillaries                                        |
| 9   | Nifty FMCG               | Consumer staples                                               |
| 10  | Nifty Consumer Durables  | Consumer discretionary                                         |
| 11  | Nifty Metal              | Ferrous + non-ferrous                                          |
| 12  | Nifty Energy             | Reliance + power + oil-marketing                               |
| 13  | Nifty Oil & Gas          | Pure-play oil & gas — partial overlap with Energy              |
| 14  | Nifty Realty             | Listed real-estate developers                                  |

**Deliberate overlaps** (talking points for interview): Banking trio shows public-vs-private momentum divergence; Pharma vs Healthcare = pure vs broad health bet; Energy vs Oil & Gas = power-utility-inclusive vs pure-commodity.

## Wave 4 — Endpoints + demo storyboard (LOCKED)

### FastAPI endpoint surface

| Method | Path                     | Purpose                                                                              |
| ------ | ------------------------ | ------------------------------------------------------------------------------------ |
| `GET`  | `/health`                | Health check (warms Render dyno)                                                     |
| `POST` | `/refresh`               | On-demand fresh OHLCV fetch + signal recompute. Returns run stats.                   |
| `GET`  | `/scan/rally`            | Rally-filter passes, ranked by composite score. Query: `?limit=20`                   |
| `GET`  | `/scan/rally/conviction` | **Top 5 Morning Summary** — Rally passes in Hot sectors only                         |
| `GET`  | `/scan/rally/by-sector`  | Top 5 Rally passes per sector. Dict keyed by sector.                                 |
| `GET`  | `/sectors/heatmap`       | All 14 sectors ranked by momentum. Hot/Neutral/Cold tags.                            |
| `GET`  | `/portfolio`             | Holdings tagged Hold/Average/Sell with reasoning                                     |
| `GET`  | `/scan/averaging`        | Holdings flagged for averaging-down                                                  |
| `GET`  | `/scan/traps`            | Holdings flagged Sell (overbought / near 52w high)                                   |
| `POST` | `/backtest/rally`        | Lightweight backtest. Body: `{start, end}`. Returns metrics.                         |
| `GET`  | `/stock/{ticker}`        | Single-stock detail: OHLCV last 1y + computed indicator series (frontend drill-down) |

### Response shape contract

Every scan response includes: `generated_at`, `stale_after`, `count`, `results[]`.
Every result row includes: `ticker`, `name`, `cmp`, `score`, **`score_breakdown` (transparency surface)**, `indicators`, `sector`, `sector_tag`, **`filter_triggers[]` (explainability)**.

`score_breakdown` and `filter_triggers` are deliberate — no black-box outputs. Reads as AI-explainability craft in the interview.

### Demo storyboard

Full Loom storyboard saved separately at:
`_bmad-output/brainstorming/portfolio-tool-demo-storyboard.md`

6-beat structure, 3:00 hard cap. Beat 5 (custom indicator + pytest suite) is the signature flex; Beat 2 (CLAUDE.md walkthrough) is the AI-PM money beat.

## Wave 5 — Narrative + repo presentation (LOCKED)

| #                              | Decision                                                                                                                                                                                                                                                                                                              | Value |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Project name                   | **Tilt**                                                                                                                                                                                                                                                                                                              |
| GitHub repo                    | Public — but Rob must create a NEW personal GitHub account first (current account is work-linked). **DO NOT PUSH until Rob explicitly says the personal account is set up.**                                                                                                                                          |
| Repo description (350 char)    | _"A read-only market intelligence dashboard for Indian equities. Scans the Nifty 500 across 14 sectoral indices using momentum + value-gap filters, surfaces high-conviction entry signals, and validates every recommendation through a backtested + unit-tested signal engine. Built end-to-end with Claude Code."_ |
| README structure               | 10 sections — Name+tagline+screenshot → What it does → Live demo (Loom + URL) → AI-tooling angle → How it works → Backtest results → Disclosed limitations → Quickstart → Repo structure → What's next                                                                                                                |
| License                        | MIT                                                                                                                                                                                                                                                                                                                   |
| Repo topics                    | `fastapi`, `python`, `claude-code`, `indian-stocks`, `nifty`, `technical-analysis`, `portfolio`, `quant`, `ai-pm`                                                                                                                                                                                                     |
| Pin to profile                 | Yes                                                                                                                                                                                                                                                                                                                   |
| "Built with Claude Code" badge | Yes — small SVG in README header                                                                                                                                                                                                                                                                                      |

## Frontend strategy (LOCKED)

- **Tool:** Claude Design (claude.ai/design, Opus 4.7-powered, launched April 2026)
- **Workflow:** Rob pastes the prompt at `_bmad-output/brainstorming/tilt-claude-design-prompt.md` into Claude Design → exports React + Tailwind component bundle → hands back to Claude Code session for wiring to live FastAPI
- **Stack:** React + Tailwind, deployed to Vercel
- **MCP server priority:** **Deferred to stretch.** Only build if Figma frontend + Groww integration + Loom recording all land with time remaining. Mention as "what's next" in Loom Beat 6 regardless of whether it ships.

## Session synthesis

### What this brainstorm produced

Three durable artifacts:

1. **This session file** — every locked decision across 5 waves
2. **`portfolio-tool-demo-storyboard.md`** — the 3-min Loom script with pre-recording checklist and backup plan
3. **`tilt-claude-design-prompt.md`** — self-contained prompt to feed Claude Design for the 5 screens

### The interview thesis (single sentence)

> "I built Tilt — a market intelligence tool for Indian equities — end-to-end with Claude Code, treating the AI as a small team I led through CLAUDE.md, sub-agents, and slash commands. The signal math is verified from spec; the recommendations are explainable; the limitations are disclosed."

### Implementation order (next session)

Build in this order. Items in **bold** are critical path; items in parens are stretch.

1. **Repo skeleton** locally (no push yet — wait for Rob's new GH account)
2. **`CLAUDE.md`** — project rules, sub-agent roles, slash command registry, conventions
3. **`indicators/`** — custom RSI + MACD from spec + pytest suite vs pandas-ta
4. **Market data layer** — yfinance primary + bhavcopy fallback adapter behind `MarketDataProvider` interface, Parquet cache
5. **Universe + sector membership** — Nifty 500 + 14 sectoral index constituent loaders
6. **Signal engine** — Rally / Averaging / Trap filters + composite score formula
7. **Sector rotation overlay** — sector index momentum ranking + Hot/Neutral/Cold tagging
8. **FastAPI app** — all 11 endpoints with the locked response shape contract
9. **`backtest-runner` sub-agent** — parallel filter-variant runs over past 12 months
10. **Mock portfolio JSON** for build-time (real Groww swap deferred)
11. **Slash commands** — `/morning-summary`, `/scan-sectors`, `/backtest`, `/portfolio-status`
12. **Render deploy config** — `render.yaml`, `requirements.txt`, env var template
13. **README** — all 10 sections
14. (Parallel) **Claude Design generation** — Rob runs `tilt-claude-design-prompt.md` through claude.ai/design, brings back React bundle
15. **Frontend wiring** — connect React components to live FastAPI endpoints
16. **Deploy to Render + Vercel**, pre-warm before demo
17. **Live Groww integration** — Rob purchases credentials, swap from mock JSON
18. **Loom recording** — follow `portfolio-tool-demo-storyboard.md`
19. (Stretch) **MCP server** wrapping Groww — only if time remains

### Open items requiring Rob's action (not Claude's)

- Create a new personal GitHub account (work account is currently linked) — signal Claude when ready to push
- Buy Groww API credentials at deploy-time (NOT build-time)
- Generate screens in Claude Design using the prompt artifact
- Record the Loom

---

**Brainstorming session complete.** Frontmatter updated. Ready to begin implementation in the next session.
