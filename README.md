# Tilt

> A read-only market intelligence dashboard for Indian equities. Scans the Nifty 500 across 14 NSE sectoral indices using momentum + value-gap filters, surfaces high-conviction entry signals, and validates every recommendation through a backtested + unit-tested signal engine.

**Built end-to-end with [Claude Code](https://claude.com/claude-code).**

[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-D97757?style=flat-square)](https://claude.com/claude-code)
![Python](https://img.shields.io/badge/python-3.12-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/fastapi-0.110%2B-009688?style=flat-square)
![Tests](https://img.shields.io/badge/tests-128%20passing-22D3A4?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

---

## What it does

Tilt scans the Nifty 500 across **14 NSE sectoral indices** with three technical filters:

| Filter        | Triggers when                                                                                    | Use        |
| ------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| **Rally**     | MACD crossover (3d) + close > EMA20 + RSI 45-62 + ≥15% below 52-week high                        | Buy signal |
| **Averaging** | CMP < avg buy price + RSI < 35 + MACD histogram rising                                            | Average down on existing holdings |
| **Trap**      | RSI > 70 **OR** within 2% of 52-week high                                                         | Sell signal on existing holdings |

A **sector-rotation overlay** ranks the 14 indices by their own momentum and tags each Hot / Neutral / Cold. The **conviction list** surfaces only Rally passes inside Hot sectors — top-down + bottom-up agreement.

Every result row carries its **`score_breakdown`** (momentum / upside / RSI / sector contributions) and **`filter_triggers[]`** (which conditions fired). No black-box outputs.

---

## Live demo

- **API:** *Live URL lands at step 16 — currently runs locally via `uvicorn tilt.api.app:app`.*
- **Dashboard:** *Vercel URL lands at step 16. React + Tailwind frontend in `frontend/`.*
- **Loom walkthrough (3 min):** *Pending step 18.*

API docs auto-generated at `/docs` once the server is up.

---

## The AI-tooling angle

This project is an interview artifact for an AI PM role at [inflexion.io](https://inflexion.io). The thing being evaluated is **how Claude Code was driven**, not financial alpha. Scroll the repo top-down and you'll see:

- **[`CLAUDE.md`](CLAUDE.md)** — auto-loaded context: project rules, conventions, the sub-agent roster, the slash command registry. Every constraint learned during the build is encoded back here so future iterations don't drift.
- **[`.claude/agents/`](.claude/agents/)** — 2 sub-agent definitions: `data-fetcher` (pulls OHLCV behind the provider chain + parquet cache), `backtest-runner` (fans out parameter sweeps in parallel). Each returns a small JSON summary so the main session's context window stays uncluttered.
- **[`.claude/commands/`](.claude/commands/)** — 4 slash commands: `/morning-summary`, `/scan-sectors`, `/backtest`, `/portfolio-status`. The operator interface — repeatable ops baked into a keystroke.
- **[`tests/indicators/test_parity.py`](tests/indicators/test_parity.py)** — RSI and MACD implemented from spec, asserted against `pandas-ta` to 4 decimal places across 11 regime variants. The "verify the math, don't trust the library" beat.
- **128 unit tests** run in under 10 seconds. Zero live-network tests in the default run.

---

## How it works

```
Universe (47 Nifty 500 + 14 sectoral lists)
         │
         ▼
DataFetcher ──► [YFinanceProvider ► BhavcopyProvider*] ──► ParquetCache
         │
         ▼
SignalEngine ── { RSI, MACD, EMA20, 52w-high } per ticker
         │
         ├─► Rally   ─► top-5 in Hot sectors  ──► /scan/rally/conviction
         ├─► Averaging ─► holdings underwater  ──► /scan/averaging
         └─► Trap    ─► holdings overbought   ──► /scan/traps
         │
         ▼
SectorRotation ── rank 14 sectors by avg constituent momentum,
                  tag top-4 Hot / middle-6 Neutral / bottom-4 Cold

* BhavcopyProvider is a deliberate stub — interface implemented, fetch deferred.
```

### Composite score

```
score = 0.35·momentum + 0.25·upside + 0.20·rsi_sweet_spot + 0.20·sector
```

Component definitions and normalizations are documented inline in [`tilt/signals/score.py`](tilt/signals/score.py).

---

## Backtest results

Walk-forward Rally backtest, Nifty 500 starter universe, past 12 months (refresh with `/backtest/rally`):

| Metric                        | Value     |
| ----------------------------- | --------- |
| Triggers                      | *Pending live run* |
| 30-day hit rate               | *—*       |
| Avg 30-day forward return     | *—*       |
| Max drawdown per signal       | *—*       |

Run the backtest yourself:

```bash
.venv/bin/python -c "
from datetime import date, timedelta
from tilt.backtest import run_rally_backtest
from tilt.api.routes import get_data_fetcher
from tilt.universe import get_universe
end = date.today(); start = end - timedelta(days=365)
r = run_rally_backtest(get_data_fetcher(), [s.ticker for s in get_universe()], start, end)
print(r.metrics)
"
```

---

## Disclosed limitations

Talking points, not hidden bugs. Each gets a "what production would do" sentence so the gap is intentional, not unaware.

1. **Survivorship bias.** The backtest uses today's universe across the full historical window. Names delisted before today are absent → results skew optimistic.
   *Production: source point-in-time NSE constituent lists per quarter.*
2. **Filter-tuning lookahead.** Rally thresholds (RSI 45-62, MACD window 3, 52w gap ≥ 15%) were chosen with knowledge of recent market behavior, not blind to history. The `backtest-runner` sub-agent's parameter sweep is meant to **surface** that sensitivity, not hide it.
   *Production: walk-forward parameter optimization on a held-out window.*
3. **Mock portfolio at build time.** `data/mock_portfolio.json` (9 holdings) backs the `/portfolio` and `/scan/{averaging,traps}` endpoints. Live Groww integration is wired behind the same `PortfolioProvider` interface and lands at step 17 once credentials are purchased.
4. **Nifty 500 starter universe (47 of 500).** Hand-curated subset of the most liquid Nifty 500 names. Strict accuracy: every ticker verified, no fabricated symbols.
   *Production: fetch the official NSE constituent CSV at startup, refresh quarterly.*
5. **`BhavcopyProvider` is a stub.** Fallback architecture pattern is real (`DataFetcher` iterates the chain), but the bhavcopy fetch raises `ProviderError` until wired. yfinance is the sole live source.
6. **No order execution. Ever.** Tilt is read-only by design. Status tags are decision support, not investment advice.
7. **Free-tier Render coldstart.** First request after idle takes 30-60s. Pre-warm `/health` 1-2 min before the demo.

---

## Quickstart

```bash
# 1. Clone + venv
git clone https://github.com/mannicaaaa/tilt-bse-dashboard
cd tilt-bse-dashboard
python3.12 -m venv .venv && source .venv/bin/activate

# 2. Install + test
pip install -r requirements.txt
pytest                                # 128 pass in ~10s

# 3. Run the API
uvicorn tilt.api.app:app --reload --port 8000
open http://localhost:8000/docs

# 4. Try the slash commands inside Claude Code
#   /morning-summary
#   /scan-sectors
#   /portfolio-status
#   /backtest
```

Env vars (copy `.env.example` to `.env`):

| Variable             | Default     | Purpose                                       |
| -------------------- | ----------- | --------------------------------------------- |
| `PORTFOLIO_PROVIDER` | `mock`      | One of `mock`, `empty`, `groww` (step 17+)    |
| `GROWW_API_KEY`      | *(empty)*   | Set on Render dashboard at step 17            |
| `GROWW_API_SECRET`   | *(empty)*   | Set on Render dashboard at step 17            |

---

## Repo structure

```
tilt/                     # Python package
├── indicators/           # custom RSI + MACD (verified vs pandas-ta)
├── data/                 # MarketDataProvider + yfinance/bhavcopy + parquet cache
├── universe/             # Nifty 500 + 14 sectoral JSON + loaders
├── signals/              # Rally/Averaging/Trap filters + composite score
├── sectors/              # sector rotation overlay
├── portfolio/            # PortfolioProvider + Mock/Empty/(Groww@17)
├── backtest/             # walk-forward Rally backtest engine
└── api/                  # FastAPI app + 11 endpoints

tests/                    # pytest — 128 passing
data/
├── cache/                # parquet OHLCV cache (gitignored)
└── mock_portfolio.json   # build-time holdings

.claude/
├── agents/               # data-fetcher, backtest-runner
└── commands/             # /morning-summary, /scan-sectors, /backtest, /portfolio-status

docs/
├── SPEC.md               # all design decisions (5 waves) + 19-step build plan
├── DEMO_STORYBOARD.md    # 3-min Loom script
└── CLAUDE_DESIGN_PROMPT.md  # frontend spec for claude.ai/design

frontend/                 # React + Tailwind bundle from Claude Design
CLAUDE.md                 # auto-loaded session context (sub-agent roster, conventions)
render.yaml               # Render deploy blueprint
```

---

## What's next

1. **Live Groww swap.** `GrowwPortfolioProvider` plugs into the same `PortfolioProvider` interface. One-line change once credentials land.
2. **Point-in-time NSE constituents.** Eliminates survivorship bias in the backtest.
3. **MCP server wrapping Groww.** So Claude Code itself can query holdings directly without the API layer in between. Mentioned in Demo Storyboard Beat 6.
4. **Intraday cadence with cost guardrails.** Today the `/refresh` button is the only fetch trigger. Production could poll smartly with a circuit breaker.

---

## License

MIT — see [`LICENSE`](LICENSE).
