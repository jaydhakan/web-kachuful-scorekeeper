# Prompt: review the sound work (paste everything below the line into a new chat, Opus)

---

Review the **sound work for Kachuful and Kaali Teeri** on branch `feat/sound` in `web-kachuful-scorekeeper`. It
was built by another model from `docs/SOUND-PLAN.md`, using the brief in `docs/SOUND-BUILD-PROMPT.md`. Assume
nothing in its final report is true until you've checked it. **Review only: change no code** until I've seen the
findings.

## Read first

1. **The rules:**
   - `CLAUDE.md`
   - `docs/codebase/CONTRIBUTING.md`
   - `docs/codebase/ARCHITECTURE.md`
2. **What was asked:**
   - `docs/SOUND-PLAN.md`, all of it (§4 and §5 are the event maps, §6 the engine, §9 the tests)
   - `docs/SOUND-BUILD-PROMPT.md`, for the decisions made on top of the plan
3. **What was done:**
   - the branch: `git fetch`, then `git log --oneline origin/main..feat/sound` and `git diff origin/main...feat/sound`
   - `docs/codebase/TODO.md`

## Check, in this order

1. **Plan coverage.** Build a table with one row for every event row in §4 and §5, plus the decisions. For each row
   give:
   - the sound and tier the plan asks for
   - where it's wired (file:line)
   - whether it's **done, different or missing**

   Then list the extra cues that are in the code but not in the plan.
2. **Correctness of timing** (the bugs most likely to be here):
   - Does anything play twice? Check for:
     - StrictMode double effects
     - re-renders
     - remounts on navigation
     - reloads mid-game
     - undo, then redo
     - the desk and phone layouts both mounted
   - Is every `scheduleCues` cancelled on tap-to-skip, unmount and leaving the page?
   - Is anything left running after a cancel, such as timers or oscillators?
   - Do spectators and the recap viewer stay silent for past events, sounding only for live ones?
   - Does sound follow the state, not the animation? With reduced motion on, do you get exactly the `reducedCue`?
   - Does the limiter hold up with 6–11 players in the reveal run, and with ducking during a moment?
3. **Settings:**
   - Is `baithak.fx` respected at All, Big moments and Off, by the quick mute too, with no new storage key?
   - Is all storage access through `persistence.ts`?
   - Is the default (Big moments) the exact set the build prompt lists?
   - Are Spades' mode and `sfx()` unchanged?
4. **The engine:**
   - Do `AudioContext` nodes disconnect after they play?
   - Is the noise buffer cached?
   - Does audio unlock on the first gesture on iOS and Android?
   - Is `audioSession` left alone, so the silent switch is respected?
   - Is `__fxLog` really stripped from the production build? Check `dist/` after `npm run build`.
   - Do the haptic patterns go through the vibrate preference?
5. **Performance:**
   - Is there any static import of `fx/sound` in the game entry chunks? Check the build output.
   - Does `npm run perf:budget` pass, and what's the bundle delta from `main`?
6. **The tests:** do they test anything real?
   - Would each e2e test fail if the cue were removed?
   - Is it checking `__fxLog` order, not only that the log is non-empty?
   - Are the §9 unit tests all present: the limiter, pitch, `scheduleCues` with fake timers, totality of the event
     tables, and the mute cycle?

   Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:e2e`, and report the real numbers. Rerun e2e
   failures one at a time before calling them real.
7. **House rules:**
   - Accessibility: a 44px quick mute, an `aria-label`, focus, and the toast.
   - Design tokens only, with no hex.
   - Comments of 1–3 lines.
   - Conventional commits with no co-author trailer, no merge and no push.
   - `TODO.md` is updated.
   - Working docs are not committed.
   - Generated output is cleaned up.
8. **By ear, where you can:**
   - Open the lab's Sound Board (`/?lab=moments`) with `npm run dev`.
   - You can't hear it, but check that every `SoundName` has a button, a tier and a "plays when" line.
   - Check that peak gains match §8: ticks about 0.05, beats 0.1–0.15, moments up to 0.25, all under MASTER 0.55.

## Report

- **First, a verdict:** merge as is, merge after fixes, or rework.
- **Then the coverage table** from step 1.
- **Then the findings, most severe first.** Each finding gives:
  - file:line
  - what's wrong
  - a concrete way to trigger it
  - the fix you'd make

  Tag each finding as **confirmed** (you reproduced it or ran it) or **likely** (from reading the code). Leave out
  style nits unless they break a house rule.
- **Then:**
  - what still needs a real phone (Android, and an iPhone with the silent switch)
  - anything the plan itself got wrong, which should be fixed in the plan rather than the code
- **Finally,** ask me whether to apply the fixes. If I say yes, fix them as small Conventional commits on `feat/sound`,
  rerun the checks, and update `TODO.md`.
