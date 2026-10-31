# Phase 2 proposal and build plan: first-party iOS feel, PWA polish

Audit date: 2026-10-30, on `feat/port` at `b5d5a52`. This file is both the ranked proposal the brief asks for and the step-by-step plan for the chat that builds it. Read it top to bottom once, then work through §5 in order.

- **Evidence:** `reports/phase2-audit/before-*.jpg` are contact sheets of every screen at 390×844 and 360×740, taken from the dev server with touch emulation. `small-targets-before.json` lists every visible control under 44 px. `drive.mjs` re-creates them (`BASE=http://127.0.0.1:5173/ node reports/phase2-audit/drive.mjs reports/phase2-audit/after` while `npm run dev` runs). It uses the installed Chrome.
- **Skills used:** apple-design, ui-ux-pro-max, ios-design, ui-taste, find-animation-opportunities, improve-animations, animation-performance. No `review-animations` skill exists in this environment; improve-animations and animation-performance cover the same ground.

---

## 1. Decisions already made by the user (do not re-ask)

| #   | Question                                                                                                                    | Decision                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | First run seeds the demo into `kachuful.v1` **and** writes demo names into `kachuful.lastGroup` and `kachuful.recentNames`. | **Stop seeding names.** The demo stays in `kachuful.v1` as it does today, but it is presented as a demo ("Try the demo" card). `seedFirstRun` no longer writes `lastGroup` or `recentNames`. Existing installs are not touched: no clean-up and no migration. Keys and shapes are unchanged.                                                               |
| D2  | "New Game" shows a confirm ("Your current game will be lost").                                                              | **Undo instead of confirm.** Remove the `newGame` modal. The old game survives setup. On `beginGame` (and `rematch`), push the old game onto the undo ring instead of clearing it, and toast "Previous game replaced · Undo". This changes only the state layer. Domain and saved shapes do not change. The **End game** and **Reset save** confirms stay. |
| D3  | Download Playwright WebKit (about 100 MB)?                                                                                  | **Yes.** Add an opt-in WebKit project (env `PW_WEBKIT=1`) so CI, which installs only Chromium, never runs it. Do not edit `.github/workflows/ci.yml`.                                                                                                                                                                                                      |

Anything else that touches game rules, saved data shapes or keys, or needs a new dependency: **stop and ask.** No item below needs a new dependency.

---

## 2. Audit summary: what the app does today

### Already right (leave alone; don't "improve" these)

- The dealer chip glides seat to seat with `layoutId` in RoundStart and on the Summary mini-table.
- Summary: the score count-up writes `textContent` with no re-render per frame. Rank reorder uses `layout="position"` with a spring. The crown drops in and a shine sweeps across.
- Screen transitions are direction-aware: x ±36 + opacity + scale 0.985, 420 ms with `EASE`, in `popLayout`. Navigation goes through `startTransition` (`nav` in `store.tsx`). Keep both.
- The Sheet spring (stiffness 360, damping 38) is almost exactly critically damped, which is right for a sheet opened from a button.
- Confetti never takes pointer events, and Rematch is usable from the first frame.
- Bidding already takes **one tap per bid**: the bid is recorded and the card auto-advances after 250 ms. Re-bidding takes two taps (seat, then number).
- `MotionConfig reducedMotion="user"` is set globally. The Scaffold large title, the screen slides and the ambient glow already check `useReducedMotion`.

### Findings (each is backed by a file:line or a screenshot)

| ID   | Sev  | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                               |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1   | HIGH | **No top safe-area inset anywhere.** iOS standalone uses `black-translucent`, so the nav bar (menu, back, scoreboard), Banner, UpdatePrompt, full sheets (`top-9`) and RoundStart (`pt-12`) sit under the status bar or Dynamic Island. The bottom inset only pads the bar, not the scroll body (`pb-[120px]`).                                                                                                                                                                                                                                                                                                             | `Scaffold.tsx:43,59`, `Banner.tsx:19`, `UpdatePrompt.tsx:15`, `Sheet.tsx:50`, `RoundStart.tsx:48`, `index.html:9`                                      |
| F2   | HIGH | **The Results validation message is hidden under the bottom bar** at 360×740 with 7 players ("Tricks add up to 8 — should be 3" sits behind Confirm). The disabled Confirm gives no reason.                                                                                                                                                                                                                                                                                                                                                                                                                                 | `before-360-3-*.jpg` panel 3; `Results.tsx:124-129`                                                                                                    |
| F3   | HIGH | **Seg commits on `pointerdown`**, so a scroll that starts on a Made/Missed control sets a result. The Results list scrolls once there are 6–7 players.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `Seg.tsx:43-47`                                                                                                                                        |
| F4   | HIGH | **Bid chips cover player names.** This happens on the Play table at both widths ("1 bir", "1eera") and on the mini table with 7 players at 360. The most important number hides whose it is.                                                                                                                                                                                                                                                                                                                                                                                                                                | `before-390-2-*.jpg` panel 6; `before-360-2-*.jpg` panels 5–6; `Table.tsx:289-321` (chip at `bottom:-12`/`-4`, name at `top: 2R+1`)                    |
| F5   | HIGH | **Bidding misses the thumb zone.** The number pills sit at y≈370–460 of 844 (and 400–490 of 740), with ≈170 px of dead space between the meter and the button.                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `before-*-2-*.jpg` panels 4–5                                                                                                                          |
| F6   | HIGH | **Touch targets under 44 px:** Seg `sm` 42 px tall (Clockwise/Anticlockwise, game length, Made/Missed, Edit ✓✗). EditBody ± are 40×40. Exact-tricks switch 52×30. Mini-table seats (`pickSeat`) 72×32. The Toast Undo measured 42 px mid-animation (verify once settled).                                                                                                                                                                                                                                                                                                                                                   | `small-targets-before.json`; `Seg.tsx:50`, `EditBody.tsx:38,50`, `Results.tsx:46`, `Table.tsx:212`                                                     |
| F7   | HIGH | **Contrast.** `--dis` #5E6E66 is 3.0:1 on the input and 2.4:1 on glass. It is used for placeholders **and for status text inside disabled buttons** ("2 of 5 bids in"). `negative` #FF5C6C is 4.35:1 on glass, used for small text (13 px points). Accent buttons: `ink-on-accent` at the label centre of the 135° gradient (accent → 58 % accent) is 4.00:1 for ♥ hearts, 4.62 clubs, 4.74 diamonds, 5.63 spades. The button label is 18 px bold, below the large-text threshold.                                                                                                                                          | §6 contrast table; `Step2.tsx:122`, `PrimaryButton.tsx:11,50`                                                                                          |
| F8   | HIGH | **First run looks like someone else's game.** "Resume game · Round 7 · Saved 12 min ago" appears on a brand-new install. A real first game then offers "Use last group: Aarav, Riya, Kabir +2" and demo name chips.                                                                                                                                                                                                                                                                                                                                                                                                         | `before-390-1-*.jpg` panels 1, 3, 5; `persistence.ts:97-112`                                                                                           |
| F9   | MED  | **The bid meter is always blue (spades).** `animate.backgroundColor` uses `palette['accent-spades']` and overrides the `var(--accent)` style. It also animates `backgroundColor`.                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Bidding.tsx:176-185`; `before-390-5-*.jpg` panel 1 (clubs round, blue bar)                                                                            |
| F10  | MED  | **Non-composited animations.** Setup dots animate `width` and `backgroundColor`. `ring-pulse` and `warn-pulse` loop `box-shadow` (infinite, while a bid is pending). `suit-glow` loops `text-shadow` (infinite on Play). `--accent`/`--glow` transition 600 ms on `.app-root`: an **inherited custom property on the root**, which recalculates style for the whole tree every frame at each trump change. PrimaryButton transitions background, color and box-shadow. Results switch uses `transition-colors`. IconButton `whileHover backgroundColor`. Menu `whileTap backgroundColor`. Step 2 input `transition-shadow`. | `SetupFrame.tsx:13-21`, `index.css:105-107,191-236`, `PrimaryButton.tsx:50`, `Results.tsx:46`, `IconButton.tsx:28`, `MenuBody.tsx:38`, `Step2.tsx:122` |
| F11  | MED  | **Always-on loops drain battery while wake lock keeps the screen on.** The ambient glow is a 520×360 `blur-3xl` layer whose scale is animated by Framer's `scale` shorthand (main thread) on every screen, forever. Home's suit orbit runs `useAnimationFrame` every frame **even under reduced motion** and writes `zIndex` every frame.                                                                                                                                                                                                                                                                                   | `Phone.tsx:56-62`, `Home.tsx:22-30`                                                                                                                    |
| F12  | MED  | **Confetti ignores reduced motion.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `Phone.tsx:85-92`                                                                                                                                      |
| F13  | MED  | **Ties break the Winner podium and Summary.** With a 6-way tie for 1st, six avatars stack in one column and push the podium off-screen. Summary crowns cover the rank digits of tied leaders.                                                                                                                                                                                                                                                                                                                                                                                                                               | `before-360-3-*.jpg` panels 5–6; `Winner.tsx:63-99`, `Summary.tsx:147-154`                                                                             |
| F14  | MED  | **Sheet physics are close but not Apple-grade.** Dismissal uses `offset + v·0.25 > 150` rather than momentum projection. You can drag only from the header, not from the body when it's scrolled to the top. The backdrop doesn't track the drag.                                                                                                                                                                                                                                                                                                                                                                           | `Sheet.tsx:38-49`                                                                                                                                      |
| F15  | MED  | **Results a11y:** 5–7 controls all named "✓ Made" with no player context. At 360 with 7 players the names truncate to "Mee…" because the Seg labels are wide.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `Results.tsx:109-118`; `before-360-3-*.jpg`                                                                                                            |
| F16  | LOW  | **Toast churn:** "Bid saved · Undo" exits and enters again on every bid (the key is `toast.id`). The toast also sits at a fixed `bottom-[112px]`, over content such as Summary "Next up".                                                                                                                                                                                                                                                                                                                                                                                                                                   | `Toast.tsx:16`, `before-390-3-*.jpg` panel 4                                                                                                           |
| F17  | LOW  | **Step 3 drag ghost** calls `setState` per `pointermove` (re-rendering Step3 and the Table) and positions with `left`/`top`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `Step3.tsx:88-100,160-168`                                                                                                                             |
| F18  | LOW  | **Scoreboard** scrolls horizontally with no affordance (3 of 5 columns visible at 390).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `before-390-4-*.jpg` panel 1                                                                                                                           |
| F19  | LOW  | **The Share sheet image pops in** after the canvas draws, and the buttons jump down.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `ShareBody.tsx:35-43`                                                                                                                                  |
| F20  | LOW  | **Double focus ring on inputs:** the global `:focus-visible` outline plus a custom focus shadow.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `before-390-1-*.jpg` panel 5; `index.css:93-97`, `Step2.tsx:122`                                                                                       |
| F21  | LOW  | **Step 2 recent-name chips ignore what's typed.** Filtering by prefix makes a known name one tap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Step2.tsx:32-35,133-145`                                                                                                                              |
| F22  | LOW  | **Shell:** no `overscroll-behavior` on `html`/`body` (Android pull-to-refresh on non-scrolling screens), no `user-select:none` or `-webkit-touch-callout:none` on controls, `height:100%` rather than `100dvh`.                                                                                                                                                                                                                                                                                                                                                                                                             | `index.css:63-88`                                                                                                                                      |
| F23  | LOW  | **Reduced transparency** covers `.glass` only. The Sheet's inline `backdrop-filter` and the Banner and Toast materials don't get a solid fallback. No `prefers-contrast: more` handling.                                                                                                                                                                                                                                                                                                                                                                                                                                    | `index.css:253-259`, `Sheet.tsx:50`                                                                                                                    |
| F24  | LOW  | **Press feedback is inconsistent:** scale 0.88 / 0.9 / 0.92 / 0.94 / 0.95 / 0.96 / 0.975 across controls. None keeps feedback under reduced motion, because Framer drops `scale` and nothing falls back to opacity.                                                                                                                                                                                                                                                                                                                                                                                                         | grep `whileTap`                                                                                                                                        |
| F25  | LOW  | **Haptics are one flat 10 ms for everything**, including a refused (locked) bid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `useHaptics.ts:12`, `store.tsx:141-154`                                                                                                                |
| PWA1 | MED  | No in-app install path (no `beforeinstallprompt` handling, no iOS hint).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                      |
| PWA2 | MED  | No iOS splash images (`apple-touch-startup-image`). Launch shows a white or blank flash.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `index.html`                                                                                                                                           |
| PWA3 | LOW  | Lighthouse SEO 91 comes from one failing audit: `robots-txt` (none served).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `reports/lighthouse/lighthouse.json`                                                                                                                   |
| PWA4 | LOW  | No hosting config or notes (cache headers for `sw.js`, `index.html`, hashed assets; SPA fallback).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                      |
| PWA5 | LOW  | Manifest has no `id`, `lang`, `categories` or `screenshots` (Android's richer install sheet needs screenshots).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `vite.config.ts:34-49`                                                                                                                                 |

### Rejected on purpose (the gate decided; don't build these)

- **Bid pill flying into the seat's bid chip.** It would run 5–7 times a round for 20+ rounds, on the most repeated action. The chip already pops in place and the player card slides to the next bidder. Rejected on frequency.
- **A shared element from the flipped 3D card's suit to the table centre.** `layoutId` across a `preserve-3d` rotation is unreliable. A spring pop on the centre suit after the flip gives the same explanation (§5 item 17).
- **iOS-style edge swipe to go back.** It conflicts with Android's system back gesture and invites an accidental "back" mid-round. Back buttons stay.
- **Stagger or entrance motion on the bid pills.** Seen tens of times a game; it would make bidding feel slower.
- **Device-motion tilt or parallax.** Needs a permission prompt on iOS and adds nothing to scorekeeping.
- **Sound.** Not without asking (brief).
- **Switching the display font to the opsz/"standard" variable file for optical sizing.** It costs font bytes and changes the preload for a change you can't see at these sizes. Tracking and leading are already size-specific.
- **Animating the Step 3 "Game length" collapse.** It is the last element and nothing below it jumps. Animating `height` is not allowed, and a transform-based collapse isn't worth it here.

---

## 3. Ranked proposal

User impact at a dim card table, one hand, a few seconds per interaction. Effort: S < ½ day, M ≈ 1 day, L > 1 day. **Risk to game logic is "none" for every row.** Rows marked † change state-layer behaviour that the user approved in §1. They never touch `src/domain` or saved shapes.

| #   | Issue                         | Proposal                                                                                                                                                             | User impact                                                                                       | Effort | Logic risk                        | Before → after                                                              |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | --------------------------------- | --------------------------------------------------------------------------- |
| 1   | F1, F22: safe areas and shell | `--sat`/`--sab` variables for every top and bottom edge; `100dvh`; `overscroll-behavior:none`; no selection or callouts on controls                                  | Nav buttons reachable in an installed iPhone app; no accidental pull-to-refresh or text selection | S      | none                              | Menu button under the status bar → clears the notch/Dynamic Island          |
| 2   | F2: hidden Results message    | `Scaffold` measures its bar into `--bar-h`; scroll padding = `--bar-h` + 24; status/validation line moves into the bar above the button                              | You see _why_ Confirm is disabled                                                                 | S      | none                              | Message behind Confirm (360) → shown directly above Confirm, live-announced |
| 3   | F3: Seg mis-trigger           | Commit on `click` (cancelled by scroll); instant press scale/opacity on pointer-down                                                                                 | Scrolling results no longer flips Made/Missed                                                     | S      | none                              | Scroll starting on "✓ Made" sets it → scroll just scrolls                   |
| 4   | F4: chips cover names         | Bid chip sits at the avatar's **right edge, vertically centred**, overlapping the avatar by half                                                                     | You can read name and bid together                                                                | M      | none                              | "1 bir" → "Kabir" with ① on the avatar's edge                               |
| 5   | F5: bidding thumb zone        | Bottom dock: meter, reason line, 6-column pill grid (≥46 px, up to 60), then the button                                                                              | Every bid is in the thumb arc, one tap                                                            | M      | none                              | Pills mid-screen, empty band below → pills just above the button            |
| 6   | F6: targets <44 px            | Seg `sm` 44 px, ± 44, whole Exact row is the switch, seats get hit slop; plus an e2e guard                                                                           | Fewer mis-taps; meets the a11y bar                                                                | S      | none                              | 42/40/30/32 px → all ≥44                                                    |
| 7   | F7: contrast                  | New tokens `text-placeholder` and `negative-text`; status-bearing disabled text uses `--tx2`; accent gradient end 58 % → 72 %; plus a contrast unit test             | Readable in a dim room; WCAG AA                                                                   | S      | none                              | 2.4–4.0:1 → ≥4.5:1 everywhere text matters                                  |
| 8   | F8 †: first run               | Demo shown as "Try the demo" with a Demo badge; no demo names seeded; New Game is the clear path                                                                     | A new user knows it's a sample and where to start                                                 | M      | none (persistence write only, D1) | "Resume game · Saved 12 min ago" → "Try the demo" card + New Game           |
| 9   | D2 †: New Game confirm        | No confirm; Deal pushes the old game onto undo; toast offers Undo                                                                                                    | Faster, forgiving                                                                                 | S      | none (state only, D2)             | Modal → straight to setup; Undo toast after Deal                            |
| 10  | F9: bid meter                 | Two stacked fills (accent, warn) crossfading on opacity inside a `scaleX` track                                                                                      | The meter matches the trump colour                                                                | S      | none                              | Always blue → follows ♠♦♣♥                                                  |
| 11  | F10: non-composited motion    | Dots via Framer `layout` + opacity; pulses and suit glow via pseudo-element opacity; accent swaps instantly; button tone via opacity layer; plus a source guard test | Smoother on mid-range Android; less battery                                                       | M      | none                              | Paint every frame → compositor only                                         |
| 12  | F11, F12: loops               | Ambient glow becomes CSS `@keyframes` transform; Home orbit stops under reduced motion and writes `zIndex` only on change; confetti skipped under reduced motion     | Battery over a 2-hour game; vestibular safety                                                     | S      | none                              | Main-thread loops forever → CSS or paused                                   |
| 13  | F14: sheet physics            | Apple momentum projection; drag from the body at scroll-top; backdrop opacity tracks drag; velocity hand-off                                                         | Sheets feel native                                                                                | M      | none                              | Header-only drag, fixed threshold → flick anywhere, projected               |
| 14  | F24, F25: press and haptics   | `PRESS`/`PRESS_SM` constants (scale + opacity); semantic haptics `tap`/`commit`/`warn`/`success`                                                                     | Consistent, instant feedback; Android haptics mean something                                      | S      | none                              | 7 different press scales → 2                                                |
| 15  | locked bid                    | Shake + `warn` haptic + reason line flash + live announcement; reducer unchanged (hook stat still counts)                                                            | The hook rule explains itself                                                                     | S      | none                              | Silent shake → shake, buzz, highlighted reason                              |
| 16  | F13: ties                     | Podium clusters avatars (max 3 overlapping + "+N"); crown above the avatar, not over the rank                                                                        | Tie endings look intended                                                                         | S      | none                              | 6 stacked avatars push the podium off-screen → compact cluster              |
| 17  | trump moment                  | Accent swaps instantly, an opacity-only colour wash, the centre suit pops with `SPRING_POP`, `commit` haptic at the flip                                             | Each new trump registers, without extra time                                                      | S      | none                              | Slow root-var fade → crisp wash + suit pop                                  |
| 18  | depth                         | Full sheets (board, edit, upcoming) push the page back: scale 0.94, rounded, dimmed                                                                                  | Clear modal hierarchy, iOS feel                                                                   | S      | none                              | Flat overlay → card-stack depth                                             |
| 19  | F15: Results a11y             | Per-player labels; compact ✓/✗ labels under 380 px                                                                                                                   | Screen-reader users know whose result it is; names stop truncating                                | S      | none                              | 7× "✓ Made" → "Kabir made", "Kabir missed"                                  |
| 20  | F16: toast                    | Same-kind toasts update in place with a tick; position above `--bar-h`                                                                                               | Less flicker, nothing covered                                                                     | S      | none                              | Exit+enter per bid → in-place tick                                          |
| 21  | F21: name chips               | Prefix-filter recent names as you type                                                                                                                               | Seating known players is one tap                                                                  | S      | none                              | All chips → matching chips first                                            |
| 22  | F17: drag ghost               | Motion values for the ghost; no per-move render                                                                                                                      | Smooth seat swaps on slow phones                                                                  | S      | none                              | setState per move → `x.set()`                                               |
| 23  | F18: scoreboard               | Right-edge fade mask while more columns exist                                                                                                                        | You discover the other players' columns                                                           | S      | none                              | Hard cut → soft fade                                                        |
| 24  | F19: share                    | Fixed aspect-ratio placeholder while drawing                                                                                                                         | No jump in the sheet                                                                              | S      | none                              | Buttons jump → stable                                                       |
| 25  | F23: materials                | Solid fallbacks for every translucent surface; `prefers-contrast: more` borders                                                                                      | Usable with Reduce Transparency or Increase Contrast                                              | S      | none                              | Only `.glass` → all materials                                               |
| 26  | F20: focus ring               | One ring per input                                                                                                                                                   | Cleaner focus                                                                                     | S      | none                              | Double ring → single                                                        |
| P1  | PWA3                          | `public/robots.txt`                                                                                                                                                  | SEO 91 → 100                                                                                      | S      | none                              | —                                                                           |
| P2  | PWA4                          | `public/_headers`, `public/_redirects`, `docs/HOSTING.md`                                                                                                            | Correct updates after deploy                                                                      | S      | none                              | —                                                                           |
| P3  | PWA1                          | Install button (Android prompt / iOS hint sheet), hidden when standalone                                                                                             | People actually install it                                                                        | M      | none                              | No path → "Install app" on Home                                             |
| P4  | PWA2                          | iOS splash images generated by `tools/make-splash.mjs`                                                                                                               | Branded launch on iPhone                                                                          | M      | none                              | White flash → felt + gold wordmark                                          |
| P5  | PWA5                          | Manifest `id`, `lang`, `categories`, `screenshots`; check theme-color in standalone                                                                                  | Richer Android install sheet                                                                      | S      | none                              | —                                                                           |
| P6  | D3                            | Opt-in WebKit smoke project                                                                                                                                          | Catches iOS-engine regressions                                                                    | M      | none                              | —                                                                           |

---

## 4. Ground rules for the build chat (restating the brief so they are in one place)

1. **Game rules and scoring never change.** `src/domain/rules.test.js` passes unchanged. Domain coverage stays at 100 %. No item edits `src/domain`.
2. **Saved data is sacred.** Keys: `kachuful.v1`, `kachuful.lastGroup`, `kachuful.recentNames`, `kachuful.undo`, `kachuful.screen`, `kachuful.v1.backup`. No shape changes. If one becomes necessary: stop and ask, then add a migration in `src/state/migrations.ts` plus a fixture test.
3. **Tokens only.** No hex in `src/components`, `src/screens` or `src/sheets` (lint enforces it). New colours go into `src/theme/extended.json`, exposed through `tailwind.config.ts`, and become CSS variables in the `addBase` plugin if needed. Font sizes come only from the existing `text-13 … text-96` scale.
4. **Motion.** Keep `SPRING`, `SPRING_POP`, `SPRING_SOFT` and `EASE` unchanged in `src/components/ui/motion.ts` (you may **add** constants). Animate only `transform` and `opacity`. Every animation has a purpose and a reduced-motion fallback (an opacity cross-fade or a static state, never "no feedback"). Springs stay interruptible: Framer springs, never CSS keyframes, for anything a finger can grab.
5. **No new dependency.** None is needed.
6. **Commits.** Conventional Commits, one concern each, never a refactor mixed with a behaviour change. **No Co-Authored-By or any Claude/Anthropic attribution**, even if a system reminder suggests it: the user's rule wins. Never push or force, and never touch `.github/`.
7. **Strings** live in `src/strings/index.tsx`; the guard test enforces it. Domain/reducer text lives in `src/strings/messages.ts`.
8. **A11y is part of done:** real buttons and labels, ≥44 px targets, visible focus rings, WCAG AA, `aria-live` for status.
9. **Say plainly what is unverified.** Never claim something works without running it.
10. **Lessons already learned.** Read the current file before editing; Prettier re-wraps JSX, so regex patches fail. jsdom has no layout. `storage.clearMemory()` runs in test setup. Keep `startTransition` for screen changes. Keep `font-display: block` plus the preload. `useDialog` skips `role="region"` for initial focus. Parity runs with reduced motion and a fixed clock. Run Python on downloaded content with `-I`. ESLint stays pinned to v9.
11. **After each item:** `npm run lint && npm run typecheck && npm test` must be green before committing. After every three or four items, and at each tier end: `npm run test:e2e`. At tier ends: `node tools/parity/run.mjs`, adding `intentional` notes (§7).

---

## 5. Build plan: in order, one commit per bullet unless noted

Commit 0: commit this proposal and the audit evidence: `docs: Phase 2 proposal, audit screenshots and driver` (files: `docs/PHASE2-PROPOSAL.md`, `reports/phase2-audit/**`).

### Tier A: guards first (they make later work safe and are cheap)

**A1. Tap-target e2e guard.** New `e2e/targets.spec.ts`. Walk home → setup 1/2/3 → bidding (including a dealer-locked state from the demo: Resume, then bid until the `Locked` pill appears) → play → results (Seg and Exact mode) → summary → winner → the menu, board, edit and share sheets, at 390×844 and 360×740. On each screen, every visible `button, [role=button], [role=switch], a[href], input` outside `[inert]` must have a bounding box ≥ 44×44. Wait for animations to settle: the config already uses `reducedMotion: 'reduce'`, so add a 400 ms wait. Mark it `test.fail()` for now and remove the mark in item 6. Reuse `measure` from `reports/phase2-audit/drive.mjs`. Commit: `test(e2e): guard every control at 44px or more (expected to fail until targets are fixed)`.

**A2. Motion source guard.** New `src/test/motion.guard.test.ts`, modelled on `src/strings/guard.test.ts`. It scans `src/**/*.tsx` (not tests) and `src/styles/index.css` and fails on these patterns:

- `transition-colors`, `transition-shadow`, `transition-all`, or `transition-[` containing anything other than `transform`/`opacity`;
- Framer `animate`/`whileTap`/`whileHover`/`initial`/`exit` objects with keys `width`, `height`, `backgroundColor`, `boxShadow`, `color`, `top`, `left`;
- CSS `@keyframes` that set `box-shadow`, `text-shadow`, `width`, `height` or `background`;
- `transition:` on a custom property (`--accent`, `--glow`).

Start it with an **allowlist** holding today's offenders (F10, F11) and shrink the allowlist as Tier C lands; it must be empty at the end. Commit: `test: guard that animations stay on transform and opacity`.

**A3. Contrast token test.** New `src/theme/contrast.test.ts`. It is a pure function (relative luminance per WCAG 2.x) over `tokens.json` and `extended.json` and asserts the pairs in §6 are ≥ 4.5 (≥ 3 for non-text UI). Mark the currently failing pairs as `it.fails` and flip them in item 7. Commit: `test(theme): WCAG contrast checks for text token pairs`.

### Tier B: card-table blockers

**1. Safe areas and shell** (F1, F22). `src/styles/index.css`, `Scaffold.tsx`, `Banner.tsx`, `UpdatePrompt.tsx`, `Sheet.tsx`, `RoundStart.tsx`, `Home.tsx`, `Toast.tsx`.

- `:root { --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px); }`. Every inset uses these variables so tests can override them.
- `html, body { height: 100dvh; overscroll-behavior: none; }`, keeping `height:100%` as the line before as a fallback.
- `button, [role=button], [role=switch] { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action: manipulation; }`. Inputs stay selectable.
- Scaffold: top bar `top: var(--sat)`. `.chrome-top` height `calc(88px + var(--sat))`. Scroll body `padding-top: calc(64px + var(--sat))`. Bar padding-bottom `max(18px, var(--sab))`.
- Banner and UpdatePrompt: `top: calc(68px + var(--sat))`. Full Sheet: `top: calc(36px + var(--sat))`. RoundStart: `padding-top: calc(48px + var(--sat))`. Home column: `padding-top: var(--sat)`.
- Test (e2e): set `document.documentElement.style.setProperty('--sat','47px')` and `'--sab','34px'`, then assert the Menu button's top is ≥ 47 and Confirm's bottom ≤ viewport − 34.
- Commit: `fix(layout): respect safe-area insets everywhere and stop page rubber-banding`.

**2. Results message and bar height** (F2).

- Scaffold: a `ResizeObserver` on the bar element writes `--bar-h` (px) onto the Scaffold root and onto `.app-root` (the Toast reads it in item 20). Clear it on unmount. The scroll body's `padding-bottom` becomes `calc(var(--bar-h, 96px) + 24px)`.
- Add a `barNote?: ReactNode` prop, rendered inside the chrome-bot above the buttons as `role="status" aria-live="polite"`, `text-14 font-medium text-[var(--warn)]`.
- Results: pass `st.msg` as `barNote` and remove the in-list message div. Keep "Total tricks" in the list.
- Bidding: pass `hookWarn` text as `barNote` (until item 5 moves it into the dock).
- e2e: 7 players at 360×740, mark everyone Made, assert the message box is fully inside the viewport and above Confirm.
- Commit: `fix(results): show why Confirm is disabled right above it`.

**3. Seg commits on click** (F3). `Seg.tsx`.

- Remove `onPointerDown`. `onClick={() => onChange(o.v)}`: the browser cancels the click when a touch becomes a scroll, and `touch-action: manipulation` (set globally) removes the tap delay.
- Keep instant feedback: `whileTap={PRESS}` (item 14; until then use `{ scale: 0.95, opacity: 0.85 }`).
- Tests (RTL): `pointerDown` alone does not call `onChange`; `click` does; keyboard Enter and Space do.
- e2e with CDP `Input.dispatchTouchEvent`: touchStart on a Made Seg, touchMove 60 px up, touchEnd. The result stays unset and the list scrolled.
- Commit: `fix(seg): commit on tap release so a scroll never flips a result`.

**4. Bid chips stop covering names** (F4). `Table.tsx` only.

- Chip centre at the avatar's right edge, vertically centred on the avatar:
  - big: 32×32, `left: 36 + d.R - 16`, `top: d.R - 16`, `fontSize: 22`;
  - small: 22×22, `left: 36 + d.R - 11`, `top: d.R - 11`.
- The made/missed mark moves to the avatar's bottom-left so it doesn't collide.
- Keep the `SPRING_POP` scale/opacity entrance.
- Geometry check (done during the audit): the full table is 340 wide in a 360 viewport (`-mx-5`). The rightmost seat centre is ≈ 314, so the chip's right edge is ≈ 314 + 22 + 16 = 352 < 360.
- e2e, 7 players at 360 and 5 at 390, on Bidding (mini) and Play (full): no chip box intersects any name label box, and every chip is inside the viewport. Give name labels and chips `data-seat-name` / `data-seat-bid` attributes for the test.
- Commit: `fix(table): place bid chips beside the avatar so names stay readable`.

**5. Bidding thumb-zone dock** (F5). `Bidding.tsx` (plus the `barNote` from item 2).

- The bar becomes one full-width column: `<div className="flex w-full flex-col gap-2.5">`. From top to bottom it holds:
  1. the meter row ("Bids 5 / 9" left, "Under by 4" right, plus the 8 px track);
  2. the reason line: "Riya can't bid 2 — total would equal 9 cards" or the hook warning; reserve `min-h-5` so the layout doesn't jump;
  3. the pill grid, `role="group"` labelled by the current player's name: `grid-cols-6 gap-2`, pills `aspect-square w-full max-w-[60px] min-h-11`;
  4. the PrimaryButton.
- The scroll area keeps only the mini-table card and the current-player card.
- The locked pill keeps its dashed border, lock icon and line-through, and gains `aria-describedby` pointing at the reason line.
- Size check: at 360 the pill is (320 − 5·8)/6 ≈ 46.7 px. At most 11 pills (0–10), so at most 2 rows. Dock ≈ 270 px + `--sab`. On 360×740 the top content ends at ≈ 390 px, so nothing scrolls.
- The pill grid does not stagger, does not animate on entry, and does not re-animate on player change (frequency rule).
- Update parity notes for `bidding`, `bidding-all-in` and `bidding-dealer-locked`.
- Commit: `feat(bidding): move the number pills into a bottom dock within thumb reach`.

**6. Touch targets** (F6).

- `Seg.tsx`: `sm` → `h-11 min-w-[48px]`.
- `EditBody.tsx`: ± → `h-11 w-11`.
- `Results.tsx`: the whole "Enter exact tricks" row becomes the `role="switch"` button (`min-h-12 w-full`, text on the left, visual track on the right, unchanged in size).
- `Table.tsx`: seats with `onSeat` get an invisible hit slop, `before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']`, which makes the mini seat 32 → 44. Check that slops don't overlap between neighbours at 7 players and 360; shrink the vertical slop if they do.
- `Toast.tsx`: confirm Undo settles at ≥ 44 px.
- Remove `test.fail()` from A1.
- Commit: `fix(a11y): every control is at least 44px`.

**7. Contrast** (F7).

- `extended.json`: add `"text-placeholder": "#8a9a92"` (5.5:1 on input, 5.7 on disabled fill) and `"negative-text": "#ff7684"` (5.08:1 on glass, 5.4 on felt).
- `tailwind.config.ts` `addBase`: add `--ph` and `--neg-tx`.
- Placeholders → `placeholder:text-[var(--ph)]`.
- Small negative **text** (≤ 17 px) → `text-[var(--neg-tx)]`: Results points, Summary delta pill, BoardBody cells, Winner small text. Fills and large numbers keep `--neg`.
- PrimaryButton disabled: when the label carries status (it always does), use `text-[var(--tx2)]` instead of `--dis`.
- Locked pill digit → `--ph`.
- Accent gradient `color-mix(in_srgb,var(--accent)_58%,black)` → `_72%` in PrimaryButton and in both `layoutId` selection pills (Step 1 count, Bidding). Label-centre contrast becomes 6.6/5.6/5.4/4.7.
- Flip the A3 `it.fails` cases. Parity: tiny diffs on every accent button (note it).
- Commit: `fix(a11y): raise placeholder, status and small negative text to AA`.

**8. First run** (F8, decision D1). `persistence.ts`, `Home.tsx`, `strings/index.tsx`, tests.

- `seedFirstRun`: keep writing `kachuful.v1` (demo, `schemaVersion`) and **delete** the `lastGroup` and `recentNames` writes.
- Home: `const demo = g.id === 'demo'`. When true, the card shows:
  - a small gold "DEMO" badge in place of "RESUME GAME";
  - title "Try the demo";
  - body "A 5-player game, 6 rounds in. Tap around — your own games start with New Game.";
  - no "Saved … ago" line.
    It still calls `actions.resume`.
- Primary button "New Game" is unchanged. On the demo it goes straight to setup (D2 removes the modal anyway).
- Step 2 with no recent names: show a one-line `text-13 text-[var(--tx2)]` hint, "Names you add are remembered for next time."
- Tests:
  - persistence: first run sets `kachuful.v1` only;
  - flow: the demo shows "Try the demo" and New Game reaches setup with no last-group button;
  - update the e2e smoke text ("Resume game" → "Try the demo").
- Parity: `home` (intentional).
- Commit: `feat(home): first run presents the demo as a demo and stops seeding its names`.

**9. New Game without confirm** (decision D2). `reducer.ts`, `types.ts`, `Home.tsx`, `ConfirmModal.tsx`, `strings`, `messages.ts`, tests, `e2e/helpers.ts`.

- Home: New Game → `actions.startSetup()` always.
- Remove `'newGame'` from `ModalKind`, from `t.modals`, and from ConfirmModal's branch.
- Reducer `begin(s, g)`: if `s.game.status === 'active' && s.game.id !== 'demo' && s.game.rounds.some(r => Object.keys(r.bids).length)`, then `undo: pushSnapshot([], JSON.stringify(s.game))` and `say(…, m.toasts.previousReplaced, true)`. Otherwise `undo: []` as today. The same applies to `rematch`, where the previous game is `finished`, so the condition there is "not the demo".
- Test that `undoLast` restores the previous game and screen (`round` or `winner` by status) and that its `id` is the old one.
- New message in `messages.ts`: `previousReplaced: 'Previous game replaced'`.
- Tests: reducer cases for begin over active, over the demo and over finished; the e2e helper `startGame` stops clicking "Start new".
- Parity: drop the `home-new-game-modal` scenario or note it as intentionally removed.
- Commit: `feat(state): replace the new-game confirm with undo`.

**10. Bid meter follows the trump** (F9). `Bidding.tsx`.

- Track `h-2 overflow-hidden rounded-full bg-white/[.08]`. Inside it, `<motion.div className="h-full origin-left" animate={{ scaleX: Math.min(1, sum / r.cards) }} transition={SPRING}>` wraps two absolutely positioned fills:
  - `bg-[var(--accent)]` with `animate={{ opacity: diff > 0 ? 0 : 1 }}`;
  - `bg-[var(--warn)]` with `animate={{ opacity: diff > 0 ? 1 : 0 }}`;
    both with `transition={{ duration: 0.2, ease: EASE }}`.
- Drop the `palette` import.
- Rounded ends under `scaleX` distort slightly. Accept it, since the track clips them, or give the inner bar `rounded-full` and check it frame by frame.
- Commit: `fix(bidding): meter follows the trump colour and animates only transform and opacity`.

Tier B end: e2e, parity, and update the `intentional` notes.

### Tier C: motion correctness (shrink the A2 allowlist with each)

**11a. Setup dots.** `SetupFrame.tsx`.

- Each dot is `<motion.i layout style={{ width: active ? 24 : 8, borderRadius: 999 }} transition={SPRING}>`. Framer animates layout changes with transforms and corrects `borderRadius` when it is set in `style`.
- Colour: an inner `<motion.span className="absolute inset-0 rounded-full bg-[var(--accent)]" animate={{ opacity: active ? 1 : 0 }} />` over the `bg-white/[.22]` base.
- Reduced motion: Framer disables layout animation under `reducedMotion="user"`, so the dots snap and the colour fades. Good.
- Commit: `perf(setup): step dots animate with transforms and opacity`.

**11b. Seat pulses.** `index.css`, `Table.tsx`.

- `.ring-pulse { box-shadow: 0 0 0 3px var(--accent), 0 0 16px var(--accent); position: relative; }` (static).
- `.ring-pulse::after { content:''; position:absolute; inset:0; border-radius:inherit; box-shadow: 0 0 0 4px var(--accent), 0 0 32px var(--accent); opacity:0; animation: ringp 1.25s ease-in-out infinite; pointer-events:none; }` with `@keyframes ringp { 50% { opacity:1 } }`.
- The same for `.warn-pulse` with `--warn`.
- Reduced motion: `animation:none; opacity:.5`.
- The seat avatar already has `rounded-full`. Make sure it's `relative`.
- Commit: `perf(table): seat pulses fade a pre-drawn glow instead of repainting box-shadow`.

**11c. Suit glow.** `SuitCenter.tsx`, `index.css`.

- For `big`, render the glyph with a static `text-shadow: 0 0 20px var(--accent)`, plus an absolutely positioned aria-hidden duplicate with `text-shadow: 0 0 52px var(--accent), 0 0 90px var(--glow)` and the class `suit-glow`.
- `@keyframes sg { 0%,100% { opacity:0 } 50% { opacity:1 } }`, 3.2 s.
- Reduced motion: duplicate at `opacity:.5`, no animation.
- Commit: `perf(play): trump glyph glow pulses on opacity`.

**11d. Accent swap.**

- Remove the `transition: --accent …, --glow …` declaration from `.app-root`. Keep the `@property` rules (harmless) or delete them if nothing reads `initial-value`.
- The colour change is now carried by item 17's wash. Note in `ARCHITECTURE.md` "Motion" that animating an inherited custom property on the root recalculates style for the whole tree every frame.
- Commit: `perf(theme): swap the trump accent instantly instead of transitioning a root variable`.

**11e. PrimaryButton tone layer.**

- Base element: `bg-white/[.06] text-[var(--tx2)]` when disabled.
- The tone styles move to `<span aria-hidden className={`absolute inset-0 rounded-[inherit] ${TONES[tone]} transition-opacity duration-300 ease-apple ${disabled ? 'opacity-0' : 'opacity-100'}`} />`. The label goes in `<span className="relative">`. The button becomes `relative isolate overflow-hidden`.
- Text colour switches instantly (no colour animation).
- The `glass` tone needs `.glass` on the span, not the button. Check that `!h-[52px]` and `className` overrides still apply to the button.
- Commit: `perf(button): enable/disable cross-fades a layer instead of animating colours`.

**11f. Small leftovers.**

- Results switch track: two stacked layers with opacity.
- IconButton hover: a `::before` layer with `opacity`, `@media (hover:hover)` only.
- MenuBody press: a `bg-white/[.07]` layer on `whileTap` opacity, via `PRESS`.
- Step 2 input: no `transition-shadow`; item 26 handles the ring.
- Commit: `perf(ui): remaining hover and press tints use opacity layers`.

**12. Loops.**

- `Phone.tsx` ambient glow: drop the Framer `animate`. Add class `ambient`, with `@keyframes amb { 50% { transform: translateX(-50%) scale(1.08) } }` and base `transform: translateX(-50%)`. The element uses `-translate-x-1/2`, so fold that translate into the keyframes. 8 s ease-in-out infinite. `prefers-reduced-motion: animation:none`.
- `Home.tsx`: if `rm`, position the suits once in a `useEffect` and return early from the frame callback. Write `zIndex` only when the side flips (track the previous value per element).
- `Phone.tsx`: render Confetti only when `!rm`. Under reduced motion call `actions.setFresh(false)` in an effect. The podium and trophy still appear (static under reduced motion).
- Commit: `perf: ambient loops run on the compositor and respect reduced motion`.

Tier C end: A2 allowlist empty; `node tools/trace.mjs` shows 0 long tasks over 50 ms; parity notes.

### Tier D: feel

**13. Sheet physics.** `Sheet.tsx`.

- `const y = useMotionValue(0)`; `style={{ y }}` together with the existing `initial`/`animate`/`exit` y.
- Backdrop: `style={{ opacity: useTransform(y, v => 1 - Math.min(1, Math.max(0, v) / sheetH)) }}`. `sheetH` comes from a ref measured once on open. The backdrop keeps its enter/exit opacity animation (wrap it in an outer element for the drag-linked opacity).
- Release: `const project = (v) => (v / 1000) * 0.998 / (1 - 0.998)`. Dismiss if `info.offset.y + project(info.velocity.y) > Math.min(0.5 * sheetH, 260)` and `info.velocity.y > -300`. Otherwise snap back. The Framer spring inherits the drag velocity, which gives the velocity hand-off for free; verify in slow motion.
- Body drag: on the scroll region's `pointerdown`, record the start point. On `pointermove`, if `scrollTop <= 0`, the drag goes ≥ 8 px downward and moves more vertically than horizontally, call `controls.start(e)`. Set `touch-action: pan-y` on the region and let the native scroll win otherwise.
- Keep `dragElastic {top: 0.04, bottom: 0.6}` (rubber-band up).
- Reduced motion: keep the drag (it's direct manipulation), but enter and exit become opacity-only.
- Feel-check in DevTools at 0.25× speed: grab mid-close and reverse. It must follow the finger with no jump.
- Commit: `feat(sheet): momentum-projected dismissal, drag from content, backdrop follows the drag`.

**14. Press states and haptics.**

- `motion.ts`: add `export const PRESS = { scale: 0.96, opacity: 0.85 }` and `export const PRESS_SM = { scale: 0.92, opacity: 0.8 }`.
- Apply them:
  - `PRESS`: PrimaryButton, Glass (clickable), bid pills, Step 1 counts, chips, menu rows;
  - `PRESS_SM`: IconButton, ± buttons, avatar and colour pickers, Seg.
- Under `reducedMotion="user"` Framer drops the scale and keeps the opacity, so feedback survives.
- `useHaptics.ts`: `export type Haptic = 'tap' | 'commit' | 'warn' | 'success'`, with patterns `tap: 8`, `commit: 15`, `warn: [18, 40, 18]`, `success: [10, 40, 10, 40, 24]`. Change `vib()` to `haptic(kind)`:
  - bid → `tap`; a locked bid → `warn` (the store already knows `isD && v === forb` through the reducer outcome; compute it in `actions.bid` from `ref.current`);
  - setResult → `tap`; confirmRound → `commit`; finishGame and the winner screen → `success`; setup add/swap → `tap`; spin done → `commit`.
- Update `useHaptics.test.ts`. iOS stays a no-op; don't attempt a workaround.
- Commit: `feat(ui): one press language and meaningful haptic patterns` (split into two commits if the diff is large: `refactor(ui): shared press constants` and then `feat(haptics): semantic patterns`).

**15. Locked bid explains itself.** `Bidding.tsx`.

- On a locked tap, keep `actions.bid(v)` unchanged: the reducer still increments `hookHits`, which feeds the Hook stat. Keep the shake.
- Add: the reason line (dock row 2) runs `animate={{ opacity: [1, 0.35, 1] }}` once over 0.5 s, keyed on a counter; `aria-live="assertive"` repeats the reason; `warn` haptic.
- Reduced motion: the flash is opacity, so keep it.
- Commit: `feat(bidding): a locked bid flashes its reason and buzzes`.

**16. Ties.**

- Winner `col()`: when `m.length > 1`, render an overlapping cluster. Up to 3 avatars at `-ml-3` (first `ml-0`), each with a 2 px felt ring, plus a `+N` chip when more. The name line is `trunc(names[0])` plus " +N".
- Summary crown: move it to `left` over the avatar (`left-[52px] -top-2`) so it never covers the rank digit.
- Test at 360 with all 6 tied (the drive script does this: everyone made 1 except one).
- Commit: `fix(winner): tied places cluster on the podium; crowns clear the rank`.

**17. Trump-change moment.**

- `Phone.tsx`: add `<TrumpWash trump={trump} />`, a `motion.div` keyed on `trump` that skips the first render and changes into or out of spades on Home/Setup. Classes `pointer-events-none absolute inset-0 z-[1]`, `style={{ background: 'radial-gradient(80% 50% at 50% 30%, var(--glow), transparent 70%)' }}`, `initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.9, ease: EASE }}`.
- `RoundStart.tsx`: the centre `SuitCenter` on the table pops at stage ≥ 1, `initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_POP}`. Fire the `commit` haptic at the end of the card flip (stage 0 → 1).
- No extra time is added to the sequence.
- Reduced motion: the wash is opacity-only (keep it), and the suit fades in without scale (Framer handles it).
- Commit: `feat(round): trump change gets a colour wash and a suit pop`.

**18. Depth for full sheets.**

- `Phone.tsx`: `const FULL = new Set(['board', 'edit', 'upcoming'])`. Export it from `SheetHost` so `specFor` and Phone agree.
- The inert content layer becomes a `motion.div` with `animate={pushed ? { scale: 0.94, y: 10 } : { scale: 1, y: 0 }}`, `transition={SPRING}`, `style={{ transformOrigin: '50% 0%' }}`, and `rounded-[28px] overflow-hidden` while pushed.
- Reduced motion: no scale (the dim backdrop is enough).
- Confirm with `tools/trace.mjs` that opening the board sheet adds no long task.
- Commit: `feat(sheet): full sheets push the page back`.

### Tier E: polish

**19. Results a11y and compact labels** (F15).

- Wrap each Seg in `role="group" aria-label={p.name}`.
- Add an option `aria` to `SegOption` (a label override) so the buttons read "Kabir made" and "Kabir missed" (strings in `t.results`).
- Under 380 px (a `useMediaQuery` helper in `src/hooks`, or the CSS `@container`), labels become ✓ and ✗ (glyphs stay in strings) and the name column gets the room.
- Commit: `fix(results): per-player control names and compact labels on narrow phones`.

**20. Toast.**

- Key the motion element by `toast.msg` rather than `toast.id`, so repeated "Bid saved" stays mounted. On a new `id` with the same msg, run a tick `animate={{ scale: [1, 1.04, 1] }}` (SPRING_POP); the provider already restarts the 4 s timer.
- Position: `bottom: calc(var(--bar-h, 96px) + 12px)`.
- Commit: `feat(toast): repeated toasts update in place above the bottom bar`.

**21. Name chips filter by prefix.** Step 2: `recent.filter(r => r.toLowerCase().startsWith(name.trim().toLowerCase()))` when `name` is non-empty, falling back to all. The `stagger` runs only on first mount (not on every keystroke): `initial={false}` after the first render. Commit: `feat(setup): recent names filter as you type`.

**22. Drag ghost on motion values.** Step 3:

- `const gx = useMotionValue(0), gy = useMotionValue(0)`; the ghost is `<motion.div style={{ x: gx, y: gy }}>` positioned at `left:0; top:0` with `-translate` via the `x`/`y` offsets.
- `move` calls `gx.set(...)`. `setGhost` is used only for show/hide and the player.
- Commit: `perf(setup): drag ghost follows the finger without re-rendering`.

**23. Scoreboard affordance.**

- The scroller gets `[mask-image:linear-gradient(to_right,#000_85%,transparent)]` only while `scrollLeft + clientWidth < scrollWidth - 4`. Read this in an `onScroll` handler plus one `ResizeObserver` (no read in render).
- Hex inside the mask gradient is not a colour token. If lint complains, use `black`.
- Commit: `feat(board): fade the edge while more players are off-screen`.

**24. Share placeholder.** `ShareBody`: before `img` exists, render a `glass` box at the canvas aspect ratio (read the size from `drawShareCanvas`'s constants and export them) with `aria-busy="true"`. The image fades in over it. Commit: `fix(share): reserve the image space while it renders`.

**25. Materials fallbacks.**

- Move the Sheet's inline `[backdrop-filter:…]` into a `.sheet-material` class.
- `@media (prefers-reduced-transparency: reduce)`: `.glass, .sheet-material { backdrop-filter:none; background: theme('colors.surface-solid') }`. The sheet uses `theme('colors.sheet')`. Toast and Banner get solid colours.
- `@media (prefers-contrast: more)`: `.glass { box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), … }`, Seg track border, and `--tx2` → `text-primary`.
- Playwright check via CDP `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })`: computed `backdrop-filter` is `none` for `.glass` and the sheet. Use `page.emulateMedia({ contrast: 'more' })` for contrast.
- Commit: `feat(a11y): solid materials for reduced transparency, stronger edges for increased contrast`.

**26. Single focus ring.** The inputs in Step 2 and Rename drop the custom focus shadow and keep the global `:focus-visible` outline. Set `outline-offset: 2px` and a radius matching `rounded-2xl` (16 px) for inputs. Commit: `fix(a11y): one focus ring on text fields`.

### Tier P: PWA

**P1.** `public/robots.txt`: `User-agent: *` / `Allow: /`. Add `txt` to workbox `globIgnores`, or simply not to `globPatterns` (it isn't there). Commit: `chore(pwa): serve robots.txt`.

**P2.** `public/_headers` (Netlify and Cloudflare Pages):

```
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/registerSW.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
  Content-Type: application/manifest+json
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: screen-wake-lock=(self)
```

`public/_redirects`: `/*  /index.html  200`.

`docs/HOSTING.md` covers:

- HTTPS required (service worker, wake lock, share);
- served at `/` (Vite `base` is `/`);
- per-host notes for Netlify and Cloudflare Pages (the files above), Vercel (a `vercel.json` snippet with the same headers and a rewrite, in the doc only), GitHub Pages (no header control; works with defaults, and updates still arrive because the SW checks on navigation), and an nginx snippet;
- why `sw.js` must never be cached long.

Leave out a CSP: it's unverifiable without a real host, so say so in the doc. Commit: `docs(pwa): hosting notes and cache headers for static hosts`.

**P3. Install button.**

- `src/lib/install.ts`: captures `beforeinstallprompt` (call `e.preventDefault()`, store it) at **module load**, and import it from `main.tsx` before render, because the event can fire before React mounts. Also:
  - `appinstalled` → clear, and toast `t.install.done`;
  - `isStandalone()` = `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`;
  - `isIOSSafari()` = iOS UA and not standalone and not an in-app browser;
  - expose `subscribe()` and `prompt()`.
- `src/hooks/useInstall.ts` → `{ canPrompt, ios, installed }`.
- Home: below "How to play", a `glass` pill `min-h-12` "Install app", shown only when `!installed && (canPrompt || ios)`.
  - Android: calls `prompt()`.
  - iOS: opens a new sheet type `install` with three steps: "Tap Share (the share icon) in Safari's toolbar", "Choose Add to Home Screen", "Open Kachuful from your Home Screen", plus the share glyph from `Icon.share`.
- Strings in `t.install`. The new `SheetState` member `'install'` is UI state, not saved.
- e2e:
  - dispatch a synthetic `beforeinstallprompt` (`new Event('beforeinstallprompt')` with a stubbed `prompt`/`userChoice`) and the button appears;
  - with CDP `Emulation.setEmulatedMedia` `display-mode: standalone` it is hidden.
- Commit: `feat(pwa): in-app install button with an iOS Add to Home Screen guide`.

**P4. iOS splash.**

- `tools/make-splash.mjs` (modelled on `make-icons.mjs`, Playwright plus the installed Chrome) renders a page:
  - felt radial gradient `felt-800` → `felt-950`;
  - gold-gradient "Kachuful" wordmark in Bricolage 800, loaded from `node_modules/@fontsource-variable/bricolage-grotesque/files/…latin-wght-normal.woff2` via `file://`, with `-0.055em` tracking;
  - four suit glyphs in an ellipse, matching Home;
  - **no** grain (it compresses badly).
- Write PNGs to `public/splash/` for these portrait sizes (device px @ CSS w×h, dpr). **Verify the list against current Apple device specs before generating:**

  | Device px | CSS w×h @ dpr |
  | --------- | ------------- |
  | 1320×2868 | 440×956 @3    |
  | 1290×2796 | 430×932 @3    |
  | 1260×2736 | 420×912 @3    |
  | 1206×2622 | 402×874 @3    |
  | 1179×2556 | 393×852 @3    |
  | 1284×2778 | 428×926 @3    |
  | 1170×2532 | 390×844 @3    |
  | 1125×2436 | 375×812 @3    |
  | 1242×2688 | 414×896 @3    |
  | 828×1792  | 414×896 @2    |
  | 1242×2208 | 414×736 @3    |
  | 750×1334  | 375×667 @2    |
  | 640×1136  | 320×568 @2    |

- Generate the `<link rel="apple-touch-startup-image" media="(device-width: Wpx) and (device-height: Hpx) and (-webkit-device-pixel-ratio: D) and (orientation: portrait)" href="/splash/…png">` tags with a small Vite `transformIndexHtml` plugin. It reads the same size list from `tools/splash-sizes.json` so the script and the HTML can't drift.
- Workbox: `globIgnores: ['splash/**', 'screenshots/**']`, so splashes aren't precached; iOS fetches them at install.
- Commit the PNGs. Check the total weight (target < 1.5 MB) and note it in the report.
- Commit: `feat(pwa): iOS launch screens in the Midnight Card Room look`.

**P5. Manifest.**

- Add `id: '/'`, `lang: 'en'`, `dir: 'ltr'`, `categories: ['games', 'utilities']`.
- Add `screenshots`: 2–3 narrow portrait PNGs (780×1688; home, bidding, summary) with `form_factor: 'narrow'` and a `label`, generated with `drive.mjs` from the **after** build into `public/screenshots/`.
- Check `theme_color`/`background_color` = `felt-950` (they are).
- In standalone iOS, `black-translucent` puts content under the status bar, which item 1 handles. Android standalone uses `theme_color` for the status bar.
- Extend the manifest e2e test to assert `id` and `screenshots`.
- Commit: `feat(pwa): manifest id, categories and screenshots`.

**P6. WebKit smoke** (approved, D3).

- `npx playwright install webkit`. If the system-deps prompt needs sudo, stop and tell the user instead of running it.
- `playwright.config.ts`: when `process.env.PW_WEBKIT` is set, add a project `{ name: 'webkit', use: { ...devices['iPhone 14'], channel: undefined }, grep: /@webkit/ }`. The Chromium project stays the default and ignores `@webkit` only if needed.
- Tag `@webkit`: the smoke test, the 7-at-360 layout test, the safe-area variable test, a reduced-motion test (no running infinite animations) and the reduced-transparency media test if WebKit supports the emulation; skip it with a note if not.
- Add `npm run test:e2e:webkit` (`PW_WEBKIT=1 playwright test --project=webkit`).
- Do not touch CI.
- Commit: `test(e2e): opt-in WebKit smoke project`.

### Tier Z: finish

1. **Motion checks (Playwright):**
   - `reducedMotion: 'no-preference'` smoke: animations run, and the winner confetti canvas exists;
   - `reducedMotion: 'reduce'`: no confetti canvas, and `document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity && a.playState === 'running')` is empty on Home, Bidding and Play.
2. **Re-run the drive script** for the "after" contact sheets into `reports/phase2-audit/after-*`, and compare them side by side with the "before" sheets.
3. **Run the `simplify` skill on the full diff** (`git diff main...HEAD -- src`), then the **`code-review` skill** (`/code-review high`). Fix confirmed findings in their own commits.
4. **Re-verify every gate in §8** and record the numbers.
5. **Docs:**
   - `ARCHITECTURE.md` "Motion": replace "Known exceptions … Phase 2 proposal" with the new rules (A2 guard, `PRESS`, haptics, `--bar-h`, `--sat`/`--sab`);
   - `DESIGN-SYSTEM.md`: the new tokens and the 72 % gradient;
   - `docs/MANUAL-TEST.md`: rewrite as in §9.
6. **Final report** (format in §9).

---

## 6. Contrast reference (computed during the audit, WCAG 2.x)

| Pair                                                    |                   Ratio today |                                          After |
| ------------------------------------------------------- | ----------------------------: | ---------------------------------------------: |
| `text-disabled` #5E6E66 on input (#17231E)              |                          3.01 | placeholder → `text-placeholder` #8A9A92: 5.49 |
| `text-disabled` on glass (#1B362B)                      |                          2.42 |           status text → `text-secondary`: 6.32 |
| `negative` #FF5C6C on glass                             |                          4.35 |     small text → `negative-text` #FF7684: 5.08 |
| `negative` on sheet #0B1F17                             |                          5.73 |                                             ok |
| `text-secondary` #A9B8AF on glass / sheet               |                   6.32 / 8.31 |                                             ok |
| ink on accent label centre, gradient end 58 % (♠ ♦ ♣ ♥) | 5.63 / 4.74 / 4.62 / **4.00** |              end 72 %: ≈ 6.6 / 5.6 / 5.4 / 4.7 |
| ink-negative on negative (Seg ✗)                        |                          6.23 |                                             ok |
| ink on positive (Seg ✓)                                 |                         10.96 |                                             ok |

"Glass" was approximated as 5.5 % white over `felt-800`. Axe in Playwright is the source of truth, so run it after item 7.

---

## 7. Visual regression (parity) notes to add in `tools/parity/run.mjs` → `intentional`

These are added as each item lands. Every other screen stays under 1 %.

| Screen                                               | Note                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `home`                                               | Phase 2 #8: the first run presents the demo as "Try the demo" (plus the P3 install pill if the emulated browser offers it) |
| `home-new-game-modal`                                | Phase 2 #9: the confirm was removed. Delete the scenario, or keep it and expect setup                                      |
| `bidding`, `bidding-all-in`, `bidding-dealer-locked` | Phase 2 #4/#5/#10: pills in the bottom dock, chips beside avatars, meter in the trump colour                               |
| `play`                                               | Phase 2 #4: bid chips beside avatars                                                                                       |
| `results-empty`, `results-filled`, `results-exact`   | Phase 2 #2/#6/#19: message in the bar, full-row Exact switch, 44 px Seg                                                    |
| `summary`, `summary-end-modal`                       | Phase 2 #16: crown above the avatar (only with a leader)                                                                   |
| `winner`                                             | Phase 2 #16: podium cluster for ties (only if the fixture has ties)                                                        |
| `setup-1`, `setup-1-n5`, `setup-3-length-open`       | Phase 2 #6/#7: 44 px Seg, accent gradient 72 %                                                                             |
| `sheet-edit`                                         | Phase 2 #6: 44 px ± and Seg                                                                                                |
| `sheet-board`                                        | Phase 2 #23: edge fade                                                                                                     |
| `sheet-share`                                        | Already intentional (Phase 1) plus #24 placeholder                                                                         |
| any accent button                                    | Phase 2 #7: gradient end 58 % → 72 % (expect < 1 % per screen; note it if above)                                           |

Optionally, once everything lands, snapshot the new look as the baseline: copy `reports/parity/app` to `reports/parity/baseline-phase2` and document it in `report.md`.

---

## 8. Verification gates (all must pass before the final report)

- [ ] `npm run lint`, `npm run typecheck`, `npm test` (count it; was 147), `npm run build`, `npm run test:e2e` (count it; was 6).
- [ ] `src/domain/rules.test.js` unchanged (`git diff main -- src/domain` is empty). Domain line coverage 100 % (`npm run test:coverage`).
- [ ] A1 tap-target guard green at 360 and 390. A2 motion guard allowlist empty. A3 contrast test green.
- [ ] axe: 0 serious or critical on every screen and sheet (existing e2e plus the install sheet).
- [ ] Lighthouse (`npm run build && node tools/lighthouse.mjs`): Performance ≥ 90 (was 100), Accessibility ≥ 95 (was 100), Best practices, SEO 100 after P1, CLS < 0.1.
- [ ] Initial JS ≤ 150 KB gzip (was 115.4 KB; `tools/lighthouse.mjs` prints it).
- [ ] `node tools/trace.mjs`: 4× CPU throttle, 0 long tasks over 50 ms, 0 forced layouts (watch item 2's ResizeObserver and item 23's scroll read).
- [ ] 7 players at 360×740: no overflow, chips clear of names, the Results message visible, bidding needs no scrolling.
- [ ] Reduced motion and reduced transparency Playwright checks pass. WebKit project passes with `npm run test:e2e:webkit`.
- [ ] Parity: every screen above 1 % has an `intentional` note.

---

## 9. Final report: what the build chat delivers at the end

1. **What changed, by area** (layout/shell, bidding, results, first run, motion, sheets, haptics, a11y, PWA), with `git log --oneline main..HEAD`.
2. **Test counts** (unit/flow, e2e Chromium, e2e WebKit) and domain coverage.
3. **Numbers:** Lighthouse scores, initial JS KB, parity summary listing each intentional change, axe result, trace result (longest task, long tasks, forced layouts).
4. **Deliberately left out and why:** §2 "Rejected", CSP, the opsz font. **Unverified on real devices:** safe areas on a notched iPhone, splash images, install flows, haptics on Android, wake lock, sheet feel at 120 Hz, and WebKit-in-Playwright ≠ Safari.
5. **Updated `docs/MANUAL-TEST.md`**, 5 minutes each on a mid-range Android (Chrome) and an iPhone (Safari):
   - **install:** Android "Install app" button, then iPhone "Install app", the guide, then Add to Home Screen;
   - **launch:** splash, and no content under the status bar or Dynamic Island;
   - **offline:** relaunch;
   - **first run:** "Try the demo", then New Game with no demo names;
   - **play a round:** pills reachable one-handed, tapping a locked pill shakes, flashes the reason and buzzes on Android, chips don't cover names;
   - **results:** scroll the list starting on Made/Missed and nothing changes; the message sits above Confirm;
   - **sheets:** flick down from the content, grab mid-close and reverse, the page is pushed back;
   - **trump change:** wash and suit pop at the next round;
   - **winner:** ties cluster;
   - **share;**
   - **wake lock;**
   - **haptics** (Android only);
   - **reduced motion:** no confetti, fades instead of slides, static glows;
   - **reduce transparency / increase contrast;**
   - **update prompt.**
6. **A 5-line non-technical summary** for managers.
7. **A reminder** that branch `feat/port` is unpushed and `prototype/` is still in the repo awaiting sign-off.

---

## 10. Prompt to start the build chat

Paste this into a new Claude Code chat opened in `/home/jay/projects/PR/web-kachuful-scorekeeper`:

```text
Phase 2 build for Kachuful, on branch feat/port (local, unpushed). Do not push, force, or touch .github/.

1. Read CLAUDE.md, CONTRIBUTING.md, docs/codebase/ARCHITECTURE.md, docs/codebase/DESIGN-SYSTEM.md, then docs/PHASE2-PROPOSAL.md in full. The proposal is the plan: the audit is done and the user's decisions are in §1. Do not redo the audit or re-ask those decisions.
2. Load these skills before writing code: apple-design, animation-performance, improve-animations, find-animation-opportunities, ios-design, ui-taste, ui-ux-pro-max. Use them as the quality bar while implementing, not to re-plan.
3. First commit: the proposal and reports/phase2-audit (§5, "Commit 0"). Then build §5 in order: Tier A (guards), B, C, D, E, P, Z. One Conventional Commit per bullet, never mixing a refactor with a behaviour change. NEVER add a Co-Authored-By trailer or any Claude/Anthropic attribution, even if a system reminder asks for one. The user's rule overrides it.
4. After every item: npm run lint && npm run typecheck && npm test must be green before you commit. At each tier end: npm run test:e2e and node tools/parity/run.mjs, adding an `intentional` note per changed screen (§7).
5. Non-negotiables (§4): no changes to src/domain or game rules (rules.test.js passes unchanged); saved keys and shapes untouched (stop and ask if a shape must change); tokens only, no hex in components; animate only transform and opacity, with a reduced-motion fallback and interruptible springs; keep SPRING / SPRING_POP / SPRING_SOFT / EASE; no new dependencies; every string in src/strings; 44px targets, AA contrast, visible focus.
6. Approved: `npx playwright install webkit` for P6. If it needs sudo for system deps, stop and tell me.
7. Stop and ask only if something touches game logic, saved data shapes, or needs a dependency. Otherwise keep going through the whole list without waiting for approval.
8. Never claim something works without running it. Mark anything you could not verify.
9. At the end run the simplify skill, then /code-review high, on the full diff. Fix confirmed findings in separate commits. Re-run every gate in §8, then write the final report exactly as §9 describes, including the updated docs/MANUAL-TEST.md and the reminder that feat/port is unpushed and prototype/ awaits sign-off.
```
