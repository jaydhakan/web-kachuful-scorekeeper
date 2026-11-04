# Prompt for Claude Code — build the Emerald Gilt theme

Copy everything below the line into a new Claude Code session opened in `web-kachuful-scorekeeper`.

---

Build the fourth theme, **Emerald Gilt** (`emerald-gilt`), exactly as planned in `docs/EMERALD-GILT-PLAN.md`. The plan
is approved: don't redesign it, and don't ask again about anything its Decisions table settles.

**Read first, in this order:** `CLAUDE.md`, `docs/EMERALD-GILT-PLAN.md`, `docs/codebase/DESIGN-SYSTEM.md`,
`src/theme/themes.ts`, `src/styles/themes.css` (all of it: each theme's token block, the materials, the `--m-*`
preview tokens), `src/screens/round/RoundStart.tsx`, the `.deal-fan` and reduced-motion rules in
`src/styles/index.css`, `src/theme/contrast.test.ts` and `e2e/themes.spec.ts`. Use Editorial Paper's blocks as the
model for structure and Sunset Glass's for how a dark theme handles glow and gold text.

**What the theme is:** a dark theme taken from an emerald-and-gold playing-card deck: a bottle-green field, gold foil
linework, Art Deco frames with a gold piano-key border, ivory card faces with green spades and clubs and crimson
hearts and diamonds. It should feel rich but calm: gold is for lines, frames and the main action, never big filled
areas. The card back is our own design in the deck's layout; use none of that deck's artwork, its "OZ" monogram,
its characters or any brand name.

**Work through the plan's Steps table in order (steps 0–10).** After each step:

1. Run `npm run typecheck`, `npm run lint` and `npm test`. Fix what you broke.
2. Commit that step alone: a Conventional Commit on branch `feat/emerald-gilt-theme`, no co-author or Claude
   trailer. Never commit `docs/EMERALD-GILT-PLAN.md`, `docs/EMERALD-GILT-PROMPT.md` or `backend-requests.md`.
3. Tell Jay the overall percentage from the table and what's next.

**Rules you must not break** (from CLAUDE.md and DESIGN-SYSTEM.md):

- Paint, never geometry. A theme changes colour, type, radius, shadow and decoration only, never a box's size,
  padding or position. `e2e/themes.spec.ts` compares every control's box across themes; it must pass with the new
  theme in its list.
- Colour values live only in `src/styles/themes.css`. The card-back SVGs are masks with no colour in them.
- Animate only `transform` and `opacity`. Each new animation runs once, never blocks a tap, and has a
  `prefers-reduced-motion` fallback (off, or a plain fade). Decorative layers are `aria-hidden`.
- Every material class gets an Emerald Gilt rule; the other three themes must look exactly as before. When you add a
  shared hook (a token like `--card-back-edge`, an element like the dotted trump ring), give it a value or a hidden
  state in all four themes.
- 44px targets, visible focus rings, real buttons and labels. Contrast passes `contrast.test.ts`: change a value
  rather than add an exception, keeping the hue.
- No new npm dependency. The Cinzel font is a downloaded woff2 file (URL in the plan), self-hosted like the others.
- Saved data keeps its keys and shapes. `DEFAULT_THEME` stays `sunset-glass`.
- Comments 1–3 lines, the reason only. Match the surrounding code's naming and density.
- Don't push. Don't touch CI.

**Craft notes for the ornament:**

- Draw the card-back SVGs by hand as clean paths on a 0 0 240 336 viewBox (playing-card ratio), 180°-symmetric,
  each under 6 KB. Check them at the reveal size (96×132) and on the Appearance tile. Detail that turns to mush at
  that size gets cut. The mini back for 16×22px dealt cards is just the frame and one dot.
- The "K" monogram is a Deco capital with curled terminals, drawn as paths.
- The rays behind the trump face and on the felt stay faint (felt 6–8% opacity). If you notice them, they're too
  strong.
- The foil glint and the button sheen are one quick sweep each. Not a shimmer loop.
- Cinzel is caps-only and wide: titles and labels yes, player names and numbers no (the plan lists which).

**Before you say a step is done, look at it.** Use `tools/screens` (or Playwright screenshots) at 360×780 and on a
large screen. Open the images and check them: the trump reveal mid-flip and after, bidding with 4 and 10 players,
results, summary, winner, a sheet, a toast, the Admin › Appearance panel with all four previews, Home, Players,
Boards. Also check with reduced motion on. Say plainly what you looked at and what you didn't.

**At the end (step 9):** run `npm run test:e2e`. It fails a few tests under load that pass alone (CLAUDE.md lists
them), so rerun failures with `npx playwright test --last-failed --workers=1`, and treat only failures that repeat
alone as real. Report the result with the output.

**Then stop.** Don't start the backend work (step 11) until Jay says so. Then follow `backend-requests.md`
in `../backend-kachuful-scorekeeper`: read that repo's `CLAUDE.md` first, then run its tests. After the backend
change is committed and checked signed in, delete the three working docs.
