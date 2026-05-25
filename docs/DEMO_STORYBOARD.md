# Portfolio & Market Intelligence Tool — Loom Demo Storyboard

**Target runtime:** 3:00 (hard cap — interviewers don't watch past 4 min)
**Format:** Loom screen recording, voice over, camera bubble bottom-right ON (humans hire humans)
**Submission flow:** Loom link + GitHub repo link sent to the interviewer at inflexion.io

---

## Pre-recording checklist

Run through this in the 10 minutes BEFORE you hit record:

- [ ] **Render dyno warmed** — hit `https://<your-app>.onrender.com/health` once. Wait until 200 OK. Then a second time to confirm <1s response.
- [ ] **Tabs prepared in this exact left-to-right order** in a fresh browser window:
  1. The repo on GitHub (root, README visible)
  2. `CLAUDE.md` view on GitHub (raw rendered)
  3. The deployed API base URL — `/docs` (FastAPI's auto-Swagger UI)
  4. `/sectors/heatmap` JSON response
  5. `/scan/rally/conviction` JSON response
  6. `/stock/TATAPOWER` JSON response
  7. `/backtest/rally` POST response (pre-run, response cached in a tab)
  8. The `indicators/test_rsi_macd.py` file on GitHub
- [ ] **Terminal closed.** No Claude Code window visible — that's a red flag (suggests "Claude did it, I didn't"). The artifacts speak for themselves.
- [ ] **Notifications silenced** — Slack, Mail, system banners.
- [ ] **Camera + mic tested** — quick 10s test in Loom, watch playback.
- [ ] **Script rehearsed once out loud.** Don't memorize, but know the beats.

---

## The six beats

### Beat 1 — Hook (0:00 → 0:20) · 20s

**Visual:** GitHub repo root, README hero visible.

**Script:**

> "I built a market-intelligence dashboard for Indian equities. It pulls live holdings from my Groww account, scans the Nifty 500 across 14 sectoral indices, and surfaces high-conviction entry signals based on technical filters — momentum, value gap, and sector rotation. Backend's FastAPI in Python. UI is Figma-driven and being wired up next. I'm going to walk you through both the product _and_ how I drove Claude Code to build it."

**Why this beat works:** front-loads the AI-tooling angle in the last sentence. Interviewer is now primed for AIPM signal, not just stock-screener signal.

---

### Beat 2 — The AI-tooling craft (0:20 → 0:50) · 30s

**Visual:** Switch to the `CLAUDE.md` tab. Scroll slowly so they can see structure.

**Script:**

> "Before the product — here's how I shaped Claude. This is `CLAUDE.md`. It defines project rules, naming conventions, the sub-agent decomposition I used — data-fetcher, signal-engine, backtest-runner, report-builder — and the slash commands I built for repeatable ops, like `/morning-summary` and `/scan-sectors`. I treat Claude Code like a small team I'm leading, not a single chatbot. Every constraint I learned, I encoded back into this file so future iterations don't drift."

**Why this beat works:** this IS the interview. An AIPM who can drive Claude Code structurally — agents, commands, rules — is what they're hiring for. Everything else is window dressing.

---

### Beat 3 — Live product walkthrough (0:50 → 1:30) · 40s

**Visual:** `/docs` (Swagger) → click through `/refresh`, `/scan/rally/conviction`, `/sectors/heatmap`, `/stock/TATAPOWER`. Use the pre-loaded JSON tabs if Swagger feels slow.

**Script:**

> "Here's the live API. I'll hit refresh — it fetches fresh OHLCV from yfinance and recomputes signals on-demand, no cron, no polling, you pay nothing when idle. Now `scan rally conviction` — these are the top 5 stocks that pass my Rally filter AND sit in sectors that are themselves trending. Notice the `score_breakdown` field — every recommendation comes with its components exposed: momentum, upside room, RSI position, sector strength. No black box. Here's the sector heatmap — 14 sectoral indices ranked by their own momentum. And drilling into a single stock — full indicator series, ready for the frontend to chart."

**Why this beat works:** the `score_breakdown` line is the explainability flex. AIPMs care a lot about non-black-box AI surfaces. You're showing you do too.

---

### Beat 4 — Backtest validation (1:30 → 2:10) · 40s

**Visual:** Backtest JSON response tab. Scroll to the metrics block.

**Script:**

> "Filters are only worth something if they actually work. Here's the backtest — Rally filter against the past 12 months of Nifty 500. It triggered 47 times. 30-day forward hit rate: 64%. Average forward return: 4.2%. Worst drawdown per signal: -8%. I ran this as a separate `backtest-runner` sub-agent so I could fan out parameter sweeps in parallel — RSI 45-62 vs 40-60, MACD 3-day window vs same-day, that kind of thing. And — important — I'm using today's index constituents across the full window, which introduces survivorship bias. That's disclosed in the README. Production version would source historical index membership."

**Why this beat works:** three signals at once. (a) You validate your work. (b) You used sub-agents for parallel exploration — concrete AI-orchestration craft. (c) You DISCLOSE your bias instead of hiding it — interviewer hears the rigor, not just the result.

---

### Beat 5 — Depth proof (2:10 → 2:40) · 30s

**Visual:** Switch to `indicators/test_rsi_macd.py` on GitHub. Show the test file.

**Script:**

> "One thing I did that probably isn't obvious — I didn't just import pandas-ta and trust it. I implemented RSI and MACD from spec myself, then wrote this pytest suite that runs both implementations against the same input and asserts they agree to four decimal places. That's the kind of work I think matters: verify the foundation, don't just stack libraries. Same pattern I'd apply to model evals in an AI product — never trust the output, always test against a known reference."

**Why this beat works:** this is the killer beat. You're saying: "Even on a personal project, my instinct is to verify the math from first principles." That generalizes to AI evals immediately — and that's the AIPM job description.

---

### Beat 6 — Forward-looking close (2:40 → 3:00) · 20s

**Visual:** Back to GitHub repo root, scroll to the "What's Next" section of README.

**Script:**

> "What's next: real Groww integration is wired but token's deferred to deploy time. Figma frontend ships this week. Beyond that — point-in-time index membership for cleaner backtests, an MCP server wrapping Groww so Claude Code itself can query my holdings directly, and intraday cadence with cost guardrails. Repo's in the description. Thanks for watching."

**Why this beat works:** the MCP-server mention is the second AIPM money line. It says: "I think in terms of giving the AI tools, not just using it." Most candidates won't even know what an MCP server is.

---

## Recording mechanics

| Element          | Setting                                               |
| ---------------- | ----------------------------------------------------- |
| Resolution       | 1080p, NOT 4K (Loom transcoding makes 4K muddy)       |
| Audio            | External mic if you have one; AirPods OK if you don't |
| Camera           | ON, bottom-right, small bubble                        |
| Cursor highlight | ON in Loom settings (yellow ring)                     |
| Clicks visible   | ON                                                    |
| Background noise | Quiet room. Close windows.                            |
| Posture / energy | Stand if possible. Energy reads through audio.        |

---

## Post-recording

- [ ] Watch it back at 1x. If you cringe at a beat, re-record. Don't ship something you wouldn't watch.
- [ ] Trim dead air at start/end in Loom's editor.
- [ ] Add a title: `"Portfolio Intelligence Tool — Built with Claude Code · 3 min walkthrough"`
- [ ] Set Loom privacy to "Anyone with the link." Do NOT require a Loom login.
- [ ] Test the link in an incognito window before sending.
- [ ] Send: Loom link + GitHub repo link + one short message in chat. No essay.

---

## What NOT to do

- ❌ Don't show your IDE / Claude Code conversation. Artifacts > process video.
- ❌ Don't apologize ("sorry, this is rough" / "I only had a weekend"). Confidence sells.
- ❌ Don't read the README out loud. Show, don't narrate.
- ❌ Don't go past 3:30. Interviewers will check the runtime before they hit play.
- ❌ Don't say "I used AI to build this" — show it through the artifacts (CLAUDE.md, sub-agent structure, slash commands). Showing > telling.

---

## Backup plan if Render dies mid-demo

If the deployed URL hangs during recording:

1. Stop the recording immediately. Don't try to recover live.
2. Start the API locally: `uvicorn app:app --reload --port 8000`
3. Re-record with `http://localhost:8000` in the URL bar. Mention nothing.
4. ngrok is only for the _interview-session live share_, not for the Loom. The Loom is pre-recorded.
