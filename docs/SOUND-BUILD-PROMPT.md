# Prompt: build the sound plan (paste everything below the line into a new chat, Sonnet)

---

Build **sound for Kachuful and Kaali Teeri** in this repo, `web-kachuful-scorekeeper`, exactly as
`docs/SOUND-PLAN.md` describes. The plan is approved. Don't redesign it. If something in it is wrong or impossible
once you're in the code, pick the smallest fix that keeps the plan's intent, and list it in your final report.

## Read first, in this order

1. **`CLAUDE.md`: the house rules.** Follow them all. The ones that matter most here:
   - no new dependencies
   - Conventional Commits, one concern each, with **no co-author trailer**
   - never push
   - comments are 1–3 lines
   - `localStorage` only through `src/state/persistence.ts`
   - progress reported as a percentage at least every 5%
   - parallel subagents for work that doesn't conflict
   - keep `docs/codebase/TODO.md` current
   - clean up generated output at the end
2. **`docs/SOUND-PLAN.md`:** all of it. §3 lists the sounds, §4 and §5 are the event maps with file:line, §6 the
   engine, §7 the quick mute, §9 the tests and §10 the phases.
3. **`docs/codebase/CONTRIBUTING.md`, `docs/codebase/ARCHITECTURE.md`, and `docs/codebase/TODO.md`.**
4. **The code as it is now:**
   - `src/fx/sound.ts`, `src/fx/prefs.ts` and `src/fx/moments.tsx`
   - `src/platform/pages/FxSettings.tsx`
   - `src/hooks/useHaptics.ts`
   - the Spades sound wiring under `src/games/spades/`: the reference for how a game calls the synth lazily
5. **Check before you trust a line number.** The plan's file:line references were correct on 2026-11-18. Code may
   have moved since, so find each spot again by name.

## Decisions (already made; don't ask)

- **Character:** table sounds: cards, wood, chips, a brass bell, a dhol fanfare for the winner.
- **Big moments by default:**
  - Kachuful: the last-round bell, the winner fanfare, and big achievements
  - Kaali Teeri: the SOLD gavel, the 1000 bell and the winner fanfare
- **The quick mute button:** yes, in each game's menu and on the desk rail (§7).
- **The iPhone silent switch:** respect it. Don't set `audioSession.type = 'playback'`. Add the one-line note to the
  setting.
- **The reveal tune:** yes, made results step up a scale.
- **Kachuful's hook:** **beat tier** (it plays on All only).
- **Late-night quiet** (from REWARDS-PLAN, decided "on"): **not in this task.** Leave a `TODO.md` line for it.

## How to work

- **Branch:** `feat/sound` from an up-to-date `main` (`git fetch` first; compare with `origin/main`).
- **Phases:** follow §10 and report progress by its weights.
  - **S0 (20%):** the 13 recipes, pitch support, and the Sound Board tab in the lab. Commit, then **tell me the lab URL
    and carry on**; don't wait. I'll tune the recipes later from the board.
  - **S1 (15%):** the engine: the limiter, `fx/sequence.ts`, `fx/feedback.ts` with the haptic patterns, `__fxLog`
    (dev/test only, stripped from prod), the noise-buffer cache, and the quick mute.
  - **S2 + S3 (25% + 25%):** Kachuful and Kaali Teeri, **as two parallel subagents.** They own different game
    folders. Give each one its section of the plan (§4 or §5), the engine API you built in S1, and the rule that it
    touches only its own `src/games/<game>/` folder. Review both diffs yourself before committing.
  - **S4 (15%):** the live pages, the leaderboard podium, e2e, `perf:budget`, the `ARCHITECTURE.md` fx section, and
    `TODO.md`.
- **Sound follows state, not animation.**
  - Cues fire from the same plan or timing objects the animations use, through `scheduleCues`.
  - Every scheduled sequence cancels on skip and on unmount.
  - Nothing replays on a re-render, a remount, a reload or a StrictMode double effect.
  - Spectators catching up on a live page hear nothing for past events.
- **Lazy only:** neither game imports `fx/sound` statically. Check this with the build output and `perf:budget`.
- **Accessibility:** the quick mute is a real `<button>` with a 44px target, an `aria-label`, a visible focus ring and
  a toast.
- **Leave alone:** Spades' own sound mode and `sfx()` path stay unchanged.

## Done means

- **These pass:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:e2e`. Follow the CLAUDE.md note
  on e2e: rerun only the failures, one at a time.
- **The §9 tests exist:**
  - the unit tests
  - e2e reading `window.__fxLog` for a Kachuful round with a hook
  - a Kaali Teeri auction through to the winner
  - the tiers (All, Big moments, Off)
  - reduced motion
- **Commits:** small and Conventional, one concern each, on `feat/sound`, **not merged and not pushed**.
- **`docs/codebase/TODO.md` gains these lines:**
  - Jay to approve the recipes on the Sound Board
  - a real-phone check (Android, and iPhone with the silent switch)
  - late-night quiet
  - anything you skipped
- **Cleanup:** `test-results/`, `playwright-report/`, screenshots and traces are deleted. Don't commit
  `docs/SOUND-PLAN.md` or any `docs/*-PROMPT.md`.
- **Final report** (short):
  - what's built, per phase
  - the lab URL
  - test results, with real numbers
  - every place you departed from the plan, and why
  - what's unverified, said plainly (sounds not heard by ear, no real iPhone)
