# CLAUDE.md

> Auto-loaded context for any Claude Code session working inside the Tilt repo. Read this before writing code. Defers to [`docs/SPEC.md`](docs/SPEC.md) on design decisions and [`docs/DEMO_STORYBOARD.md`](docs/DEMO_STORYBOARD.md) on what the final product must demonstrate.

## What Tilt is

A read-only market intelligence dashboard for Indian equities, built end-to-end with Claude Code as an interview artifact for an AI PM role. The product scans the Nifty 500 across 14 NSE sectoral indices, ranks candidates through a transparent composite score, and tags portfolio holdings as Hold / Average / Sell. **The thing actually being evaluated is the AI-tooling craft visible in this repo** — this file, the sub-agent decomposition, the slash commands, and the custom-indicator pytest suite. Financial alpha is not the centerpiece.

---

## Non-negotiable rules

1. **No `git push` without explicit user confirmation** for each new remote. Local commits are fine; remotes touch shared state.
2. **No live Groww API calls** until the user confirms credentials are purchased. The build uses `data/mock_portfolio.json` read through the `PortfolioProvider` interface.
3. **Single-user, read-only.** No auth flows, no order execution, no multi-tenancy. Secrets in `.env`, never in code or a database.
4. **`~/tilt/` is the project root.** Tilt is standalone. Never reference parent directories (`../`) — the repo must work in isolation.
5. **Disclose biases, don't hide them.** Survivorship + lookahead bias in the backtest, mock portfolio in the build — all surfaced in README and the Loom narrative.
6. **Never commit `.env`.** Only `.env.example` is tracked.

---

## Repo layout

```
tilt/                       # python package — application code
  indicators/               # custom RSI + MACD (verified vs pandas-ta in tests/)
  data/                     # MarketDataProvider interface + yfinance & bhavcopy adapters
  universe/                 # Nifty 500 + 14 sectoral index constituent loaders
  signals/                  # Rally / Averaging / Trap filters + composite score
  sectors/                  # sector-rotation overlay (Hot/Neutral/Cold tagging)
  portfolio/                # PortfolioProvider interface + mock & groww adapters
  api/                      # FastAPI app — 11 endpoints with locked response shape
  backtest/                 # backtest engine (sub-agent invokes this)
tests/                      # pytest — indicator parity, filter logic, endpoint contract
data/                       # runtime data dir (gitignored except mock_portfolio.json)
  cache/                    # parquet OHLCV cache, keyed ticker+date
  mock_portfolio.json       # build-time holdings until live Groww swap
docs/                       # SPEC.md, DEMO_STORYBOARD.md, CLAUDE_DESIGN_PROMPT.md
frontend/                   # React + Tailwind bundle from claude.ai/design (wired at step 15)
.claude/
  agents/                   # sub-agent definitions (see roster below)
  commands/                 # slash command definitions (see registry below)
```

Folders land as their implementation step does. The 19-step order is in `docs/SPEC.md`.

---

## Conventions

### Code style
- **Python 3.12.** Ruff for lint + format (config in `pyproject.toml`). No black, no isort — ruff handles both.
- **Type hints everywhere.** Public functions get full signatures. `from __future__ import annotations` at the top of every module.
- **Snake_case for symbols, kebab-case for CLI args, SCREAMING_SNAKE for env vars.** Tickers stay uppercase strings (e.g. `TATAPOWER`).
- **Dataclasses or Pydantic models for any struct that crosses a module boundary.** No raw dicts in public function signatures.

### Comments
- Default to none. The code names itself.
- Write a comment only when the **why** is non-obvious — a hidden invariant, a workaround for a specific upstream bug, a subtle bias. One line, no docstring novels.

### Errors
- Validate at boundaries (HTTP handlers, provider adapters reading external data). Trust internal code.
- External provider failures (yfinance timeout, bhavcopy 404) raise a typed `ProviderError` and the next-in-line fallback adapter takes over. Never silently return empty data on a fetch failure — the API response distinguishes "no signals" from "fetch failed".

### FastAPI response shape (LOCKED — see SPEC Wave 4)
Every scan endpoint returns this envelope:
```jsonc
{
  "generated_at": "ISO-8601 UTC",
  "stale_after": "ISO-8601 UTC",
  "count": <int>,
  "results": [ /* row objects */ ]
}
```
Every result row carries:
```jsonc
{
  "ticker": "TATAPOWER",
  "name": "Tata Power Company Ltd",
  "cmp": 412.55,
  "score": 0.78,
  "score_breakdown": { "momentum": 0.31, "upside": 0.19, "rsi": 0.15, "sector": 0.13 },
  "indicators": { "rsi": 58.2, "macd_hist": 1.4, "ema20": 405.1, "pct_below_52w_high": 0.11 },
  "sector": "Nifty Energy",
  "sector_tag": "Hot",
  "filter_triggers": ["macd_crossover_3d", "rsi_in_band", "ema20_support", "52w_gap_>=15pct"]
}
```
`score_breakdown` and `filter_triggers` are not optional. They are the **explainability surface** — every recommendation must show its work.

### Testing
- pytest only. Tests live in `tests/`, mirroring the package path (`tilt/indicators/rsi.py` → `tests/indicators/test_rsi.py`).
- **Indicators are tested against pandas-ta**, asserting agreement to 4 decimal places. This parity suite is the headline test (see step 3 and Demo Beat 5).
- **Don't mock the data provider in filter tests.** Use deterministic synthetic OHLCV fixtures — mocks hide off-by-one and timezone bugs.
- Endpoint contract is tested at the response-envelope level, not just status codes. `score_breakdown`, `filter_triggers`, and ISO timestamps are asserted on every scan response.

### Commits
- One commit per implementation step. Subject: `Step <N>: <short title>`. Body explains *why* the step exists, what it depends on, and what's deliberately deferred.
- No `--amend`, no `git push` without explicit confirmation per remote.

---

## Sub-agent roster

Tilt is built as a small team Claude leads. Each sub-agent has a narrow purpose, deterministic IO, and runs in isolation so multiple variants can fan out in parallel. Definitions live in `.claude/agents/`.

| Agent             | Purpose                                                                                          | When to invoke                                                                          | Inputs                                                            | Outputs                                            | Lands at step |
| ----------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- | ------------- |
| `data-fetcher`    | Pull OHLCV for a ticker list across a date range. Handles provider fallback + parquet caching.    | Any time the main session needs price data and doesn't want to manage retry/cache logic. | `{tickers, start, end, force_refresh}`                            | Parquet path + summary `{rows, cache_hits, source}` | 4             |
| `signal-engine`   | Compute Rally / Averaging / Trap filters + composite score for a ticker universe.                | After data fetch, when the main session wants ranked candidates without recomputing math. | `{universe, sector_tags, params}`                                 | Ranked list of result rows in the locked shape     | 6             |
| `backtest-runner` | Run a single Rally-filter variant against historical Nifty 500 and emit metrics.                 | When sweeping parameter variants in parallel (RSI 45–62 vs 40–60, MACD window, etc).     | `{params, universe, start, end}`                                  | `{triggers, hit_rate_30d, avg_fwd_return, max_dd}` | 9             |
| `report-builder`  | Compose the human-readable morning-summary brief from already-computed signals + sector tags.    | When a slash command needs prose output, not JSON.                                       | `{conviction_picks, sector_heatmap, portfolio_actions}`           | Markdown brief, demo-ready                          | 11            |

**Invocation discipline:**
- Sub-agents protect the main context window — they read large parquet files, return small summaries.
- Use them when work is **independent** (parallel parameter sweeps, multi-ticker fetches). Don't use them for trivial single-call work.
- Always prefer parallel invocation when sub-agent calls don't depend on each other.

---

## Slash command registry

Slash commands are the operator interface. Each command wraps a common workflow into a single keystroke and gives the demo a clean narrative beat. Definitions live in `.claude/commands/`.

| Command              | What it does                                                                                          | Calls                                                          | Output            | Lands at step |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------- | ------------- |
| `/morning-summary`   | One-shot: refresh data → run signal engine → rank by composite → filter to Hot sectors → format brief. | `data-fetcher`, `signal-engine`, `report-builder`              | Markdown brief    | 11            |
| `/scan-sectors`      | Recompute sector-momentum ranking and emit the Hot/Neutral/Cold heatmap.                              | `data-fetcher` (sectoral indices only), sector-rotation module | Markdown table    | 11            |
| `/backtest <filter>` | Fan out parallel `backtest-runner` invocations for a parameter sweep. Emits a comparison table.       | `backtest-runner` × N variants                                 | Markdown table    | 11            |
| `/portfolio-status`  | Read `PortfolioProvider` → tag each holding Hold/Average/Sell with one-line reasoning.                | `PortfolioProvider`, `signal-engine`                           | Markdown table    | 11            |

---

## Definition of done — per implementation step

Before marking any step in `docs/SPEC.md` complete:
1. Code compiles + ruff passes (`ruff check . && ruff format --check .`).
2. Tests for new code exist and pass (`pytest -v`).
3. One commit with `Step <N>: <title>` subject. Body explains intent and deferrals.
4. If the step touches a public surface (endpoint, sub-agent IO, slash command), CLAUDE.md and SPEC.md are updated in the same commit so docs and code never drift apart.
5. User reviews and says "go" before the next step starts. **Never silently move on.**

---

## What this file is not
- Not a substitute for `docs/SPEC.md`. SPEC is the source of truth on **what to build and why**; this file is the source of truth on **how to build it cleanly inside Claude Code**.
- Not a feature roadmap. The 19-step order is in SPEC.
- Not a place for ephemeral notes. Notes belong in commit messages or in SPEC's frontmatter.
