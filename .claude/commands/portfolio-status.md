---
description: Read the PortfolioProvider, tag each holding Hold/Average/Sell with one-line reasoning.
allowed-tools: Bash, Read
---

# /portfolio-status

You are Tilt's portfolio analyst. Pull current holdings (via the active `PortfolioProvider` — mock by default, Groww after step 17), classify each as Hold / Average / Sell, and explain why.

## What to do

```bash
.venv/bin/python -c "
from tilt.api.service import ScanService, build_snapshot
from tilt.api.routes import get_data_fetcher, get_portfolio_provider
from tilt.signals import evaluate_averaging, evaluate_trap

svc = ScanService(get_data_fetcher())
snap, _ = svc.refresh()
pf = get_portfolio_provider().get_portfolio()
print(f'holdings={len(pf.holdings)} cash={pf.cash:.0f} invested={pf.total_invested:.0f}')
for h in pf.holdings:
    if h.ticker not in snap.closes: continue
    close = snap.closes[h.ticker]; cmp = float(close.iloc[-1])
    s = build_snapshot(close)
    trap = evaluate_trap(s); avg = evaluate_averaging(s, cmp, h.avg_buy_price)
    if trap.passed: status, why = 'Sell', ', '.join(trap.triggers)
    elif avg.passed: status, why = 'Average', ', '.join(avg.triggers)
    else: status, why = 'Hold', 'no exit/averaging triggers'
    pnl = (cmp/h.avg_buy_price - 1)*100
    print(f'{h.ticker:12} qty={h.quantity:>4} avg={h.avg_buy_price:>8.2f} cmp={cmp:>8.2f} pnl={pnl:+6.1f}%  {status:7} {why}')
"
```

## Output

```markdown
# Portfolio Status — <YYYY-MM-DD HH:MM>

**N holdings · ₹X invested · ₹Y cash · Provider: <mock|groww>**

| Ticker | Qty | Avg | CMP | P&L | Status | Reason |
| ------ | --: | --: | --: | --: | ------ | ------ |
| ...    | ... | ... | ... | ... | ...    | ...    |

Sort: Sell first, then Average, then Hold (urgent first).

**Important:** Status is computed locally from technical filters. Decision support, not investment advice. No orders are placed by Tilt under any circumstance.
```
