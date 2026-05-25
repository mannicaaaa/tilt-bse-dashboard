# Tilt v3 — Frame Shift

The project doesn't look like an AI PM project from the outside. It looks like a stock screener. We fix the **frame**, not just the code.

## The new frame

**Tilt — your daily AI-written equity brief, grounded in math you can verify.**

Not a screener. A *brief*. Like Stratechery, but for Indian equities, with the numbers behind every claim.

## What changes

1. **Hero = one big daily brief**, not a 4-lane grid. Single conviction pick at the top with a 3-sentence LLM-written thesis. 4-6 supporting picks below in a tight list.
2. **Add Gemini narrative layer** for thesis + market-read text. Grounded prompts only — LLM is forbidden from inventing numbers; it only paraphrases our snapshot values.
3. **"Market read" paragraph at the top.** One LLM-generated paragraph each refresh: *"Indian markets corrective today — Value lane heavy at 23 picks, IT showing rotation strength."* Gives the dashboard a voice.
4. **Promote sector heatmap.** Currently buried in a tiny pill. New design: horizontal 14-bar strip visible on the hero.
5. **Cleaner card hierarchy.** Lead with thesis sentence, not indicator chips. Click to expand details.
6. **Portfolio P&L sidebar.** Real holdings always visible on the right rail, not behind a tab.
7. **"Decisions" README section.** Why snapshot mode, why widened filters, why LLM layered on math instead of replacing it.

## Why this is the right move

- **Differentiation:** every retail trader builds screeners. Nobody builds *briefs*. Becomes memorable.
- **AI PM signal:** the LLM-layered-on-math architecture IS the interview story. Shows you understand LLM weaknesses (hallucination) and strengths (narrative).
- **Defensibility:** every claim still traces back to our numbers. Grounded prompts mean we can answer *"how do you stop hallucination?"* with a real answer.
- **Demo quality:** a hero with one pick + a thesis paragraph reads as a *product*. A grid of small cards reads as a *tool*.

## Sub-agent fan-out

While the new frontend is being generated in Claude Design, two sub-agents work in parallel:

- **Backend agent** — builds `tilt/llm/` Gemini wrapper module + `/scan/brief` endpoint that returns the new hero shape (top pick + 3-sentence thesis + market-read paragraph).
- **Docs agent** — writes the README "Decisions" section (snapshot vs live, widened filters, LLM-layered-on-math).

## Gemini fallback

If no Gemini key configured, both thesis and market-read fields use deterministic templates derived from the existing pros/cons logic. Frontend renders identically either way — the field is just less polished.

## Demo storyboard update

Beat 3 of the Loom changes:
- **Old:** click through 4-lane grid.
- **New:** open dashboard → market read paragraph reads itself → hero pick highlighted → expand to see indicator math behind the thesis → click "show prompt" to reveal the grounded Gemini prompt (the interview money shot).

## What I need from you

One thing: a free Gemini API key from [aistudio.google.com](https://aistudio.google.com/apikey) — takes 30 seconds. Drop it in your `.env` as `GEMINI_API_KEY=...`. If you skip it, the deterministic fallback runs.

That's it. I'll handle everything else.
