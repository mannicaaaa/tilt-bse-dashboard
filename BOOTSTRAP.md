# Tilt — Bootstrap

This file orients a fresh Claude Code session inside `~/tilt/`. Open Claude Code in this directory and paste **the block below the divider** as your first message.

---

You are Claude Code, starting fresh on a project called **Tilt**.

## Project

Tilt is a read-only market intelligence dashboard for Indian equities. Backend is Python + FastAPI; frontend is React + Tailwind being generated in parallel via claude.ai/design. Deployed to Render (backend) and Vercel (frontend). Built as an interview project for an AI PM role at inflexion.io.

The thing being evaluated is **AI-tooling craft using Claude Code** — sub-agent decomposition, slash commands, a tight CLAUDE.md, custom indicators verified by pytest. Financial alpha is not the centerpiece.

## Read these three docs first

I have three design documents in `docs/`. Read them in this order before writing any code:

1. **`docs/SPEC.md`** — full design decisions across 5 waves (scope, data/infra, logic/math, endpoints, narrative) + the 19-step implementation order. This is your build plan.
2. **`docs/DEMO_STORYBOARD.md`** — the 3-minute Loom script the final product must support. Every feature you build should map to a beat.
3. **`docs/CLAUDE_DESIGN_PROMPT.md`** — the frontend spec running in parallel via Claude Design. Lists the 5 screens, components, and the JSON response shape the frontend will expect from your endpoints.

## Hard rules — NON-NEGOTIABLE

1. **DO NOT `git push`.** I am setting up a new personal GitHub account separately. I will explicitly tell you when to push. You may `git init` and commit locally.
2. **DO NOT call the live Groww API.** I have not purchased credentials yet. Use a mock holdings JSON file at `data/mock_portfolio.json` and read from it through a `PortfolioProvider` interface. I will tell you when to swap to live.
3. **Single-user, read-only.** No auth flows, no order execution, no multi-user features. Token lives in `.env`, not in a DB.
4. **This directory (`~/tilt/`) is the project root.** Tilt is NOT inside mononest or any other monorepo. Don't reference parent directories.
5. **Disclose biases in the README.** Survivorship + lookahead bias in the backtest. Mock portfolio. These are talking points, not hidden bugs.
6. **No `.env` files committed.** `.env.example` only.

## Frontend handoff (already delivered)

The frontend prototype from Claude Design is already unpacked at `~/tilt/frontend/`. It contains:

- `index.html` + 11 `.jsx` files — runs as a self-contained CDN-React/CDN-Tailwind/in-browser-Babel preview
- All 5 screens (dashboard, portfolio, scan, stock, backtest) + Settings placeholder
- Design tokens (palette + fonts) inline in `index.html` Tailwind config
- Mock data in `data.jsx` — ~20 sample stocks + 14 sectors + 9 holdings

**Critical: this is NOT a buildable production project.** It's a Claude Design preview-mode export. When you reach step 15 (Frontend wiring), the FIRST thing you do is convert this to a proper **Vite + React + TypeScript + Tailwind** setup before adding fetch calls. In-browser Babel will not survive a Vercel deploy and looks unprofessional in a Loom demo.

Known mismatches to reconcile in step 15:

- The `SECTORS` array in `data.jsx` uses `CAPITAL_GOODS` + `INFRA` (not in our locked 14) and is missing `ENERGY` + `OIL_GAS`. Bring it into alignment with the 14 sectors in `docs/SPEC.md`.
- Mock data is inline — replace with a typed API client hitting the FastAPI endpoints listed in `docs/SPEC.md`.
- The score-breakdown shape in `data.jsx` (`scoreParts: {momentum, upside, rsi, sector}`) matches our backend `score_breakdown` contract — good, low-friction handoff.

## What to build now

Start with **step 1** of the implementation order in `docs/SPEC.md`. Then **ASK ME BEFORE PROCEEDING to step 2.** I want to review each step before you move on.

For reference, the 19-step order from `SPEC.md`:

1. Repo skeleton
2. CLAUDE.md
3. Custom indicators (RSI + MACD) + pytest suite vs pandas-ta
4. Market data layer (yfinance + bhavcopy fallback, Parquet cache)
5. Universe + sector membership loaders
6. Signal engine (Rally / Averaging / Trap filters + composite score)
7. Sector rotation overlay
8. FastAPI endpoints (all 11)
9. `backtest-runner` sub-agent
10. Mock portfolio JSON
11. Slash commands (`/morning-summary`, `/scan-sectors`, `/backtest`, `/portfolio-status`)
12. Render deploy config
13. README
14. (Parallel) Claude Design generation — already in progress, I'll bring back the React bundle
15. Frontend wiring — connect React components to FastAPI endpoints
16. Deploy to Render + Vercel + pre-warm
17. Live Groww swap (only when I confirm credentials)
18. Loom recording (follow `DEMO_STORYBOARD.md`)
19. (Stretch) MCP server wrapping Groww

## Working style

- **Quality > speed.** This is an interview artifact; clean code matters more than fast code.
- **Use TaskCreate** to track multi-step work.
- **Parallelize tool calls** when independent.
- **Ask before assuming.** Rob's "never assume" rule is in effect. If `SPEC.md` is ambiguous on something, ask.
- **Write for the interviewer.** Naming, structure, comments, README — assume someone is going to read this code with critical eyes. Don't over-engineer, don't under-engineer.
- **The AI-tooling artifacts are first-class.** `CLAUDE.md`, sub-agent definitions, slash commands, the pytest suite — these are the things the interviewer will scroll. Make them shine.

## Confirm you're ready

Before starting step 1, reply with:

1. A one-paragraph summary of what Tilt is (proves you read SPEC.md)
2. The exact 19-step order as you understand it (proves you internalized the build plan)
3. The 6 hard rules in your own words (proves you'll respect them)
4. Any clarifying questions you have for me before scaffolding

Then I'll say "go" and you start step 1.
