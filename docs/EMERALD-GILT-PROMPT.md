# Prompt for Claude Code — build the Emerald Gilt theme

Copy everything below the line into a new Claude Code session opened in `web-kachuful-scorekeeper`.

---

Build the fourth theme, **Emerald Gilt** (`emerald-gilt`), exactly as planned in `docs/EMERALD-GILT-PLAN.md`. The plan
is approved: don't redesign it, and don't ask again about anything its Decisions table settles.

**Read first, in this order:** `CLAUDE.md`, `docs/EMERALD-GILT-PLAN.md`, `docs/codebase/DESIGN-SYSTEM.md`,
`src/theme/themes.ts`, `src/styles/themes.css` (all of it: each theme's token block, the materials, the `--m-*`
preview tokens), `src/screens/round/RoundStart.tsx`, the `.deal-fan` and reduced-motion rules in
`src/styles/index.css`, `src/theme/contrast.test.ts` and `e2e/themes.spec.ts`. Then open
`docs/EMERALD-GILT-TRUMP-REVEAL.html` in a browser: it's the approved prototype of the trump reveal, with the real art
and timing. Use Editorial Paper's blocks as the model for structure and Sunset Glass's for how a dark theme handles
glow and gold text.

**What the theme is:** a dark theme built from an emerald-and-gold playing-card deck: a bottle-green field, gold foil
linework, Art Deco frames, ivory card faces. It uses the **deck's real artwork** (the card back, and the King of each
suit plus the Queen of hearts) under permission Jay has from the rights holder. It should feel rich but calm: gold is
for lines, frames and the main action, never big filled areas.

**The deck art:** follow the plan's Deck art section.

- Use the publisher's files when Jay supplies them.
- Until then, extract the photo crops embedded in the prototype (data URIs) for the back, the Queen of hearts and the
  King of clubs.
- There is no King of spades or King of diamonds yet. Their trump card falls back to today's suit-glyph face. Never
  substitute another suit's card.
- The repo is public. Before committing any image, ask Jay to confirm the permission covers publishing it on GitHub.

**Work on `main`, through the plan's Steps table in order (steps 0–11).** After each step:

1. Run `npm run typecheck`, `npm run lint` and `npm test`. Fix what you broke.
2. Commit that step alone as a Conventional Commit, with no co-author or Claude trailer. Push only when Jay asks.
3. Tell Jay the overall percentage from the table and what's next.

**Rules you must not break** (from CLAUDE.md and DESIGN-SYSTEM.md):

- Paint, never geometry. A theme changes colour, type, radius, shadow and decoration only, never a box's size,
  padding or position. `e2e/themes.spec.ts` compares every control's box across themes; it must pass with the new
  theme in its list.
- Colour values and deck images are referenced only from `src/styles/themes.css`. Components use classes that paint
  from tokens (`.card-art`, `.trump-face`), so no component knows which theme has art, and other themes never
  download it.
- The other three themes look and time exactly as before. Every new hook (`--reveal-hold`, `--card-back-edge`, the
  small trump-card slot) gets a neutral value in all four themes.
- Animate only `transform` and `opacity`. Each new animation runs once, never blocks a tap (one tap still skips the
  reveal), and has a `prefers-reduced-motion` fallback (off, or a plain fade). Decorative layers are `aria-hidden`.
- 44px targets, visible focus rings, real buttons and labels. Contrast passes `contrast.test.ts`: change a value
  rather than add an exception, keeping the hue.
- No new npm dependency. The Cinzel font is a downloaded woff2 file (URL in the plan), self-hosted like the others.
- Saved data keeps its keys and shapes. `DEFAULT_THEME` stays `sunset-glass`.
- Comments 1–3 lines, the reason only. Match the surrounding code's naming and density.
- Don't touch CI.

**The trump reveal must match the prototype:**

1. The real backs fan out (40px apart, 8° each) and hold about 0.7s.
2. The trump card turns over to the King of the trump suit, or the Queen of hearts for Hearts.
3. Gold rays bloom behind it.
4. One glint sweeps across it.
5. The cards dealt to each seat show the real back.

The hold comes from a `--reveal-hold` token (`700ms` here, `0ms` elsewhere), read once on mount and added to the flip
delay and the stage timers.

**Before you say a step is done, look at it.** Use `tools/screens` (or Playwright screenshots) at 360×780 and on a
large screen, and open the images. Check:

- the trump reveal during the hold, mid-flip and after, for all four suits
- bidding with 4 and 10 players, results, summary with Next up, the upcoming-rounds sheet and drawer
- winner, a sheet, a toast, an empty Boards
- the Admin › Appearance panel with all four previews
- Home, Players, Boards
- everything again with reduced motion on

Say plainly what you looked at and what you didn't.

**At the end of step 10:** run `npm run test:e2e`. It fails a few tests under load that pass alone (CLAUDE.md lists
them), so rerun failures with `npx playwright test --last-failed --workers=1`, and treat only failures that repeat
alone as real. Report the result with the output.

**Then stop.** Don't start the backend work (step 12) until Jay says so. Then follow `backend-requests.md` in
`../backend-kachuful-scorekeeper`: read that repo's `CLAUDE.md` first, then run its tests. When that's committed and
checked signed in, do step 13: delete the plan, this prompt, `backend-requests.md` and
`docs/EMERALD-GILT-TRUMP-REVEAL.html` in one commit.
