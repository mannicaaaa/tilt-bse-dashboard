---
description: Fan out parallel Rally-filter backtests across parameter variants; emit a comparison table.
allowed-tools: Bash, Read, Agent
---

# /backtest [variant]

You are Tilt's backtest orchestrator. The user is asking you to validate the Rally filter — either with the default parameters, or by sweeping nearby variants in parallel to test sensitivity.

## What to do

If the user passed **no argument**, run the default Rally backtest over the past 12 months:

```bash
.venv/bin/python -c "
from datetime import date, timedelta
from tilt.backtest import run_rally_backtest
from tilt.api.routes import get_data_fetcher
from tilt.universe import get_universe
end = date.today(); start = end - timedelta(days=365)
fetcher = get_data_fetcher()
tickers = [s.ticker for s in get_universe()]
r = run_rally_backtest(fetcher, tickers, start, end)
m = r.metrics
print(f'triggers={m.triggers}, hit_rate_30d={m.hit_rate_30d:.2%}, avg_fwd_return={m.avg_fwd_return_30d:.2%}, max_dd={m.max_drawdown_per_signal:.2%}, avg_dd={m.avg_drawdown_per_signal:.2%}')
"
```

If the user passed a **variant or "sweep"**, fan out `backtest-runner` sub-agents in parallel. For a sensitivity sweep, the canonical set is:
- Baseline: RSI 45-62, MACD window 3, 52w gap ≥ 15%
- RSI tightened: 50-60
- RSI loosened: 40-65
- MACD window: 5 (instead of 3)
- 52w gap loosened: 10% (instead of 15%)

Use the Agent tool to spawn one `backtest-runner` per variant in **a single tool-use block** (parallel fan-out):

```
Agent(subagent_type="backtest-runner", description="baseline", prompt="...JSON input...")
Agent(subagent_type="backtest-runner", description="rsi_50_60", prompt="...")
... (all variants in the same message)
```

Aggregate the summaries into one markdown table.

## Output

```markdown
# Backtest — Rally Filter Sensitivity (<start> → <end>)

| Variant | Triggers | Hit Rate 30d | Avg Return 30d | Max DD/Signal |
| ------- | -------: | -----------: | -------------: | ------------: |
| baseline | ... | ... | ... | ... |
| rsi_50_60 | ... | ... | ... | ... |
| ...      | ...      | ...          | ...            | ...           |

**Notes:**
- Survivorship bias: today's Nifty 500 constituents used across the full window. Names delisted before today are absent. See README disclosure.
- Filter-tuning bias: baseline thresholds were chosen with knowledge of recent market behavior. The sweep is meant to surface, not hide, that sensitivity.
```

Keep it short. The interviewer reads the table, not narrative.
