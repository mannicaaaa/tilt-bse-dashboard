---
description: One-shot morning brief — refresh OHLCV, find top-5 conviction picks in Hot sectors, surface portfolio action items.
allowed-tools: Bash, Read
---

# /morning-summary

You are Tilt's morning briefer. Produce the operator's pre-market read: what to buy today, what to act on in the portfolio, what the macro rotation backdrop looks like.

## What to do

1. **Refresh data.** Use the data-fetcher sub-agent or run inline:
   ```bash
   .venv/bin/python -c "from tilt.api.service import ScanService; from tilt.api.routes import get_data_fetcher; svc = ScanService(get_data_fetcher()); snap, fr = svc.refresh(force_refresh=False); print('refreshed', fr.count, 'tickers,', fr.cache_hits, 'cache hits')"
   ```
2. **Get conviction picks** — top 5 stocks passing the Rally filter inside currently-Hot sectors:
   ```bash
   .venv/bin/python -c "from tilt.api.service import ScanService; from tilt.api.routes import get_data_fetcher; svc = ScanService(get_data_fetcher()); snap, _ = svc.refresh(); [print(f'{r.ticker:12} {r.cmp:>8.2f}  score={r.score:.2f}  {r.sector}  {r.filter_triggers}') for r in svc.rally_conviction(snap, 5)]"
   ```
3. **Get sector heatmap** — all 14 sectors with Hot/Neutral/Cold tags.
4. **Get portfolio status** — Hold / Average / Sell tags for every holding (uses `MockPortfolioProvider` by default; will be live Groww from step 17).

## Output

Emit a single markdown brief with these sections, in this order:

```markdown
# Tilt Morning Brief — <YYYY-MM-DD>

## Conviction Picks (Top 5)
| Ticker | CMP | Score | Sector | Triggers |
| ------ | --: | ----: | ------ | -------- |
| ...    | ... | ...   | ...    | ...      |

## Sector Rotation
| Sector | Momentum | Tag | Rally Passes |
| ------ | -------: | --- | -----------: |
| ...    | ...      | ... | ...          |

## Portfolio Actions
| Ticker | Status | Reason |
| ------ | ------ | ------ |
| ...    | ...    | ...    |

_Updated <ts>. Universe: <N> tickers. Refresh stats: <fetched>/<total>, <cache_hits> cache hits._
```

Keep it tight — this is a pre-market scan, not a research report. No commentary; the user reads the numbers.
