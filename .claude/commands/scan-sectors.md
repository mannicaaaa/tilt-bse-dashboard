---
description: Recompute sector momentum ranking and emit Hot/Neutral/Cold heatmap.
allowed-tools: Bash, Read
---

# /scan-sectors

You are Tilt's sector scanner. Produce a one-screen view of which Indian-equity sectors are leading and which are lagging right now.

## What to do

Call `ScanService.refresh()` and read the resulting `snapshot.rankings`:

```bash
.venv/bin/python -c "
from tilt.api.service import ScanService
from tilt.api.routes import get_data_fetcher
svc = ScanService(get_data_fetcher())
snap, _ = svc.refresh()
for r in snap.rankings:
    print(f'{r.rank:>2}. {r.display_name:<28} {r.momentum:.3f}  {r.tag}')
"
```

## Output

A markdown table sorted by rank (1 = strongest sector):

```markdown
# Sector Rotation — <YYYY-MM-DD HH:MM>

| Rank | Sector | Momentum | Tag |
| ---: | ------ | -------: | --- |
| 1    | Nifty IT | 0.62 | Hot |
| ...  | ...    | ...     | ... |

**Hot (4):** ...
**Neutral (6):** ...
**Cold (4):** ...

_Note: Banking trio (Bank / Private / PSU) and Pharma/Healthcare overlap by design — different lenses on the same theme. See SPEC Wave 3._
```
