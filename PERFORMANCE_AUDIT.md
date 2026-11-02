# Performance audit: animations

Date: 2026-11-02. Status: **audit only, no source code changed.** Waiting on approval before any fix.

Skills applied: `gsap-performance` (n/a: no GSAP in this repo, see Phase 1), `performance` (web-quality: Lighthouse, Core Web
Vitals, budgets), `performance-optimization` (measure → identify → fix → verify → guard), `animation-performance` (property
tiers, main thread vs compositor, `will-change`, blur, inherited CSS variables).

## A) Summary

### Evidence

| Signal | Scope and conditions | Result | Source |
| --- | --- | --- | --- |
| Lighthouse perf score | Home, mobile preset, simulated Slow 4G + 4x CPU, median of 3, production build | **100** (LCP 0.90 s, FCP 0.90 s, TBT 9 ms, CLS 0.027, 249 KB transferred) | Lighthouse CLI |
| Lighthouse perf score | Home, desktop preset, median of 3 | **100** (LCP 0.24 s, TBT 0 ms, CLS 0.004, 261 KB) | Lighthouse CLI |
| Non-composited animations | Home | **0** flagged | Lighthouse audit |
| Frame rate, steady-state loops | Chrome, 390x844 @2x, 4x CPU, 5 s window, 3 runs | Home orbit, round screen, Credits: **60 fps, 0 frames over 25 ms** | Chrome trace + rAF intervals |
| Main-thread busy time, Credits | same | **28 %** with effects, **3.5 %** with all CSS animations off | Chrome trace |
| Framer Motion transitions (11 flows) | `tools/trace.mjs`, 4x CPU, single run on this working tree | 1 long task (69 ms), worst interaction 88 ms, 27 of ~1,580 frames over 25 ms (**see item 1 in the top 5**) | `tools/trace.mjs` |

Lighthouse only reaches Home: the app has one URL and every other screen is in-app state, so it cannot score Credits or the
round screen. Those are covered by the traces.

### Overall verdict

The animation layer is already in good shape. Almost everything runs on the compositor (`transform`/`opacity`), the app uses
`LazyMotion` + `MotionConfig reducedMotion="user"`, every CSS loop has a `prefers-reduced-motion` fallback, there is no
`transition: all`, no animated width/height/top/left in Framer, and no scroll/mousemove listeners. **No Critical findings.**
The one real hotspot is the Credits screen.

### Top 5 problems

1. **Possible regression in the Framer transitions on this working tree.** The committed baseline (`reports/lighthouse/trace-summary.md`,
   same script) had 0 long tasks, 0 frames over 25 ms and "Three bids" at 11 commits / 648 components. The fresh run has one
   69 ms long task, 27 late frames, "Three bids" at 15 commits / 936 components. Single run, shared machine, and the tree has
   uncommitted changes in `reducer.ts`, `registry.ts`, `Step2.tsx`, `DeskSetup.tsx` and others. **Unconfirmed; needs a HEAD vs working-tree A/B** (proposed below).
2. **Credits halo: `filter: blur(46px)` on a conic gradient whose angle is an animated custom property**
   ([credits.css:73-82](src/styles/credits.css#L73-L82), keyframes [:120](src/styles/credits.css#L120)). Repaints and re-blurs every frame on the
   main thread. Single biggest raster cost: removing it cuts raster work from 1,174 ms to ~280 ms per 5 s (-76 %).
3. **Credits sheen animates `left`** ([credits.css:132-156](src/styles/credits.css#L132-L156)). Forces layout every frame while it moves: 117 layouts per 5 s, **0** with it removed.
4. **Credits name gradient loops `background-position` forever** under `background-clip: text`
   ([credits.css:197-221](src/styles/credits.css#L197-L221)). A full text repaint every frame, indefinitely, for a decoration.
5. **Credits card ring is a conic gradient behind a mask, driven by the same animated `--ang`** ([credits.css:106-119](src/styles/credits.css#L106-L119)).
   Repaints every frame. Together with items 2 and 4 these account for the screen's 1,204 paints per 5 s.

Everything else measured is cheap (see table).

### How this was measured (and what it does not show)

- Production build to a scratch directory (`vite build`, PWA on), served by `vite preview` on `127.0.0.1:4400`. Not the dev server.
- Playwright + system Chrome 4x CPU throttle, mobile emulation (390x844, dpr 2, touch). Each scenario: navigate, settle 600 ms,
  trace 5 s of steady state. Counts are main-thread `Layout`, `UpdateLayoutTree`, `Paint` events and `RasterTask` time from the trace.
- A/B: each effect disabled by injected CSS and re-measured (2 runs each, 3 for baselines).
- **Limits.** Desktop machine, shared, not a phone. Raster time is a relative signal (GPU vs software raster on this box is unknown), absolute numbers will differ on a real
  mid-range phone. **Not measured:** the Winner-screen confetti (needs a full game played), the glass theme's `backdrop-filter` surfaces, scroll-driven `edge-fade`
  scrollers, hovers (touch-first app, almost none), a real device. These are marked "hypothesis" below.
- Raw numbers for every row: scratchpad `results.json` / `results2.json` (not committed).

## B) Main table (worst to best)

Cost column: main-thread % is trace busy time over the 5 s window at 4x CPU. Baseline for the screen is in the first column's
note. All rows hold 60 fps on this machine; "cost" is headroom consumed, which is what bites on a weaker phone.

| # | Animation | Location | Page / section | Trigger | Library | Properties | Lag cause | Measured cost | Severity | UX value | Verdict |
| - | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Credits halo glow | [credits.css:73](src/styles/credits.css#L73), `cr-ang` [:120](src/styles/credits.css#L120), `@property --ang` [:3](src/styles/credits.css#L3) | Credits, behind the card | Loop 6 s | CSS | `--ang` (registered custom prop) in `conic-gradient` + `filter: blur(46px)` | Animated custom property is not composited: main-thread repaint every frame; blur 46 px far above the 20 px guideline | Raster 1,174 → ~280 ms /5 s (**-76 %**); main 27.8 → 24.4 %; paints 1,204 → 900 | **High** | Low (soft glow at 0.45 opacity) | **OPTIMIZE** |
| 2 | Credits name gradient hue loop | [credits.css:197](src/styles/credits.css#L197), `cr-hue` [:217](src/styles/credits.css#L217) | Credits, name headline | Loop 6 s, starts after fill | CSS | `background-position` + `background-clip: text` | Paint-tier property; text clip repainted each frame | Main 27.8 → 24.8 %; raster -175 ms; paints 1,204 → 900 | Med | Low-Med | **REMOVE** the infinite loop (keep the one-shot `cr-fill`) |
| 3 | Credits card ring | [credits.css:106](src/styles/credits.css#L106), `cr-ang` | Credits, around the card | Loop 4 s | CSS | `--ang` in `conic-gradient` + mask-composite | Same as #1: custom-property animation repaints each frame | Main 27.8 → 24.9 %; raster -180 ms; paints 1,204 → 900 | Med | Med (signature effect) | **OPTIMIZE** |
| 4 | Credits sheen sweep | [credits.css:132](src/styles/credits.css#L132), `cr-swp` [:148](src/styles/credits.css#L148) | Credits, over the card | Loop 4.5 s | CSS | **`left`** (layout) | Layout-tier property animated | Layout events 117 → **0**; main 27.8 → ~25.7 % | Med | Med | **OPTIMIZE** (trivial) |
| 5 | Credits sparkles, drift, bob (12 elements) | [credits.css:33](src/styles/credits.css#L33), [:49](src/styles/credits.css#L49), [:267](src/styles/credits.css#L267) | Credits | Loops 1.8-9 s | CSS | `transform`, `opacity` | None structural; many concurrent animations, each ticks style | Main 27.8 → ~22.9 % (-5 pts) | Low | Med | **KEEP** (optional: pause offscreen) |
| 6 | Credits card float (3D) | [credits.css:83](src/styles/credits.css#L83), `cr-flt` | Credits | Loop 7 s | CSS | `transform` (rotateX/Y, `preserve-3d`) | None | Main 27.8 → 26.5 %; raster -300 ms | Low | High | **KEEP** |
| 7 | Home suit orbit | [index.css:424-470](src/styles/index.css#L424-L470) | Home | Loop 9 s | CSS | `transform`, `opacity` (container units `cqw`/`cqh`) | None; composited, 0 layout, 0 paint | Main 7.6 → 3.5 % (**-4 pts at 4x**, about 1 pt real) | Low | High (brand moment) | **KEEP** |
| 8 | Round-screen ticker | [themes.css:950-971](src/styles/themes.css#L950-L971) | Bidding/Playing header | Loop 24 s | CSS | `transform` | None | Main 5.2 → 3.5 % (-1.7 pts) | Low | Med | **KEEP** |
| 9 | Ambient trump glow | [index.css:170-189](src/styles/index.css#L170-L189) | Round screen | Loop 8 s | CSS | `transform` + `will-change` | None | Main 5.2 → 4.75 % (noise-level) | Low | Med | **KEEP** |
| 10 | Pulse rings, shimmer, spinner, suit glow | [index.css:198-230](src/styles/index.css#L198-L230), [:300-315](src/styles/index.css#L300-L315) | Round, loaders | Loop | CSS | `opacity`, `transform` | None (box-shadow is drawn once, `::after` is faded) | Not separately measurable (inside round baseline) | Low | Med | **KEEP** |
| 11 | Deal fan, squash loader, ink-fill headline | [index.css:335-420](src/styles/index.css#L335-L420) | Deal, loaders, Winner | One-shot / delayed | CSS | `transform`, `opacity`; `clip-path` on ink-fill | `clip-path` is composite-tier in current Chrome; one-shot 1.8 s | Not separately measurable | Low | High | **KEEP** |
| 12 | Framer Motion UI motion: sheets, page enter/exit, bids, summary count-up, drawers | 82 files; `layoutId`/`layout` in ~14 places, e.g. [Seg.tsx:71](src/components/ui/Seg.tsx#L71), [Nav.tsx:84](src/screens/desk/Nav.tsx#L84), [BidPane.tsx:119](src/screens/desk/BidPane.tsx#L119), [Table.tsx:379](src/components/ui/Table.tsx#L379) | All screens | Tap, mount | Framer Motion 11 (`LazyMotion`) | `x`/`y`/`scale`/`opacity`; `scaleX` meters ([Results.tsx:253](src/screens/round/Results.tsx#L253)) | Shorthands run on the main thread (rAF) by design; fine unless the thread is busy | Fresh 4x trace: 1 long task (69 ms), 27 late frames of ~1,580; see problem 1 | Med (until A/B'd) | High | **KEEP**, pending A/B |
| 13 | SVG stroke draw: arrows, score chart | [Table.tsx:266](src/components/ui/Table.tsx#L266), [ScoreChart.tsx:139](src/screens/desk/ScoreChart.tsx#L139) | Table arrows, charts | Mount | Framer Motion | `pathLength` | Paint-tier but one-shot 0.5 s on a few paths | Not measured | Low | Med | **KEEP** |
| 14 | Confetti canvas | [Confetti.tsx](src/components/ui/Confetti.tsx#L9) | Winner | One-shot 2.5 s | rAF + canvas 2D | Canvas fills, DPR ≤ 2, adaptive particle count, skipped under reduced motion | Bounded, lazy-loaded, cancelled on unmount | **Not measured** (hypothesis: fine) | Low | High | **KEEP** |
| 15 | Scroll edge fades | [index.css:240-300](src/styles/index.css#L240-L300) | Scrollers | Scroll (`animation-timeline`) | CSS | `--fade-*` registered props driving `mask-image` | Custom-property animation repaints the mask while scrolling | **Not measured** (hypothesis: Low; only scrollers with overflow) | Low | Low-Med | **KEEP**, verify on device |
| 16 | Turn light on table rim | [index.css:469-500](src/styles/index.css#L469-L500) | Round table | State change | CSS transition | `transform: rotate` | None | Not separately measurable | Low | High | **KEEP** |
| 17 | Glass-theme `backdrop-filter: blur(22px) saturate(180%)` surfaces | [themes.css:423](src/styles/themes.css#L423), [:650](src/styles/themes.css#L650), [:680](src/styles/themes.css#L680), [:720](src/styles/themes.css#L720), [:898](src/styles/themes.css#L898); [Nav.tsx:107](src/screens/desk/Nav.tsx#L107) (blur 16 px) | Sunset Glass theme, tablet rail | Static, but re-blurs when content behind moves | CSS | `backdrop-filter` | Expensive when anything animates behind it | **Not measured** (needs the glass theme; a Lite/opaque fallback already exists, [themes.css:496-523](src/styles/themes.css#L496-L523)) | Med (hypothesis) | Med | **KEEP**, verify on device |
| 18 | Grain overlay layer | [index.css:106-120](src/styles/index.css#L106-L120) | Whole app, top layer | Static | CSS | `will-change: transform` on a non-animating full-viewport `::after` | `will-change` on something that never animates, full-screen layer memory | Not measured | Low | Low | **KEEP**, check with A/B |

### Phase 1 inventory notes

- **GSAP, ScrollTrigger, SplitText, Lenis, Lottie, Three.js: none present.** The `gsap-performance` rules therefore have nothing to apply to; the equivalent
  checks (cleanup, offscreen work, batching, `quickTo`-style updates) were applied to Framer Motion and the rAF code instead.
- **JS-driven motion:** one rAF loop (confetti, bounded, cancelled in cleanup). No scroll, mousemove or pointermove listeners. `ResizeObserver` only in confetti; `visualViewport` resize in
  [useVisualViewport.ts:29](src/hooks/useVisualViewport.ts#L29). Intervals are data refresh only, not animation. No IntersectionObserver reveals, no parallax, no cursor followers, no video backgrounds.
- **Framer:** `m` components via `LazyMotion` (`domAnimation` first, layout/drag features load idle, [App.tsx:10](src/App.tsx#L10)). `useReducedMotion` or `MotionConfig` covers reduced motion globally.
  Imperative `animate()` / motion values: [Step3.tsx:55-63](src/screens/setup/Step3.tsx#L55-L63), [DeskParts.tsx:167](src/screens/desk/DeskParts.tsx#L167), [DeskSetup.tsx:159](src/screens/desk/DeskSetup.tsx#L159), [PrimaryButton.tsx:27](src/components/ui/PrimaryButton.tsx#L27).
- **Checks that came back clean:** no `transition: all`; Tailwind transitions are `transition`, `transition-opacity`, `transition-transform`; no animated `width`/`height`/`top`/`left`/`margin`/`padding` in Framer props; `will-change` appears twice, both on genuinely animated or intentionally promoted layers; every CSS loop has a reduced-motion rule; no CLS source (CLS 0.027 mobile / 0.004 desktop); nothing hides the hero until JS runs (LCP = FCP = 0.90 s).

## C) Fixes for every OPTIMIZE item

Skill rule applied: name the cause, swap down a tier, keep the look. Each fix must be re-measured with the same script and reverted if it is inside noise
(performance-optimization step 4).

**#1 Halo (`cr-halo`).** Cause: animated `<angle>` custom property + 46 px blur redrawn per frame.
Fix: stop animating `--ang`. Put the conic gradient and the blur on a static element, and rotate that element with `transform`:
```css
.cr-halo { background: conic-gradient(from 0deg, var(--cr-a), var(--cr-b), var(--cr-c), var(--cr-a));
           filter: blur(46px); animation: cr-spin 6s linear infinite; will-change: transform; }
@keyframes cr-spin { to { transform: rotate(360deg); } }
```
A rotating conic circle looks the same as changing `from`. The blurred layer is rasterised once and the compositor rotates it. Reduce blur to ~24-30 px (the circle is 220 px, so
the look barely changes) to trim the one-time raster. Expected: raster ~-900 ms /5 s, main ~-3.5 pts, ~300 fewer paints per 5 s. Risk: low.

**#3 Card ring (`.cr-card::before`).** Cause: same custom-property animation. Fix: use the pattern the repo already uses for `.turn-rim`
([index.css:469](src/styles/index.css#L469)): a static masked ring parent, with a child holding the conic gradient that rotates by `transform`. Caveat: the card is
`preserve-3d`; a mask on a 3D-transformed parent can flatten children, so verify visually in all themes. Expected: -3 pts main, raster ~-180 ms. Risk: medium (visual parity).

**#4 Sheen.** Cause: `left` is layout. Fix: keep `left: -80%` fixed and animate `transform: rotate(14deg) translateX(Npx)` (or translate the percentage of its own width, 0 → ~366 %). Expected: layout 117 → 0 per 5 s,
about -2 pts main. Risk: very low.

**#2 (REMOVE rather than optimise).** `background-position` under `background-clip: text` cannot be made compositor-only. Delete the `cr-hue` leg of the animation
list ([credits.css:210](src/styles/credits.css#L210)) and keep the one-shot `cr-fill`. If the shimmer is wanted, run it for two iterations instead of `infinite`. Expected: -3 pts main, ~-175 ms raster.

**Combined expectation (estimate, not measured):** the four paint/layout offenders account for roughly the gap between 28 % and the 22-23 % floor set by the compositor-only sparkles, so Credits should land near
**22-23 % → lower with a pause-when-offscreen on the 12 sparkles** (optional). Verify with the same 5 s trace.

**Problem 1 (not an animation fix, a diagnosis).** Run `tools/trace.mjs` against a clean `git worktree` at HEAD and against the working tree, three runs each, same machine. If the working tree is worse, bisect the uncommitted
files (reducer/registry/Step2 first: commit counts rose 11 → 15 on "Three bids"). If inside noise, discard.

## D) Non-animation findings (ranked by impact)

Lighthouse is 100/100 on both form factors, so nothing here is urgent.

1. **Unused JavaScript ~51 KB** in `shell-common` (126.9 KB gzip, 123 KB transferred on Home). Lighthouse score 0.5 on that audit. Likely Framer's `domAnimation` + shell code both screens load. The repo has already split Phone/Desk shells and the layout/drag features; the remainder needs bundle-visualizer work for an uncertain gain.
2. **Unused CSS ~19 KB** (index CSS is 22 KB over the wire; all four themes ship in one sheet). Lighthouse flags ~150 ms potential. Splitting themes per active theme is possible but complicates live theme switching (view-transition cross-fade). Gain is small; probably leave.
3. **`pwa-192.png` (20 KB) fetched at first load** by the manifest. Not blocking; only worth it if the install icon can be deferred.
4. **Fonts:** one 29.5 KB woff2 on the critical path (Instrument Sans), Bricolage is 41 KB and loaded later. Already trimmed in the 2026-11-01 pass; no action.
5. **Caching/compression:** brotli and gzip precompressed in the build; `reports/perf/hosting.md` records the production header changes as applied. Not re-verified here (local preview only).
6. **Third-party scripts:** none.

## E) Prioritised action plan

**Quick wins (small, local to `credits.css`, no behaviour change):**
1. Sheen: `left` → `transform` (#4).
2. Drop the infinite `cr-hue` loop, keep the fill (#2).
3. Halo: static gradient + blur, rotate with `transform`; trim blur to ~24-30 px (#1).

**Medium (needs visual check in every theme):**
4. Card ring: static mask + rotating child, same as `.turn-rim` (#3).
5. Optional: pause the 12 Credits sparkles while offscreen or after the first screenful.

**Diagnose before touching (no code change yet):**
6. HEAD vs working-tree A/B of `tools/trace.mjs` to confirm or dismiss problem 1.
7. Real-device pass (mid-range Android, remote debugging) for what this desktop run cannot show: Credits at 120 Hz, glass-theme `backdrop-filter`, confetti, scroll edge fades.

**Guard (performance-optimization step 5):** after fixes, add the Credits scenario to `tools/trace.mjs` so a regression in main-thread %, paints or layouts per 5 s fails visibly.

## Attempt ledger

| Idea | Status |
| --- | --- |
| Remove or rewrite each Credits effect | **Proposed**, measured per-effect, awaiting approval |
| Remove orbit / ticker / ambient on Home and round | Not proposed. Cost 0.5-4 pts at 4x CPU, compositor only, high UX value |
| `will-change` on Credits layers | Rejected as a first step. Skill: only after the wrong-property cause is fixed |
