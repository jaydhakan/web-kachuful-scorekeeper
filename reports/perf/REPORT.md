# Performance, PWA and polish pass (2026-11-01)

Baseline: `f6149ec`. Raw tables: [`before/`](before) and [`after/`](after). Hosting changes to make by hand:
[`hosting.md`](hosting.md).

## How it was measured

- `tools/lighthouse.mjs`, a Lighthouse user flow, median of 3, served over HTTPS/HTTP/2 as production is. Steps:
  - first visit
  - returning mid-game (saved game on the device, empty HTTP cache)
  - a played round as a timespan (INP)
  - the tablet UI
- Two throttling modes, both Slow 4G with 4x CPU:
  - **Simulated:** Lighthouse's own mobile score.
  - **Applied:** DevTools throttling for real (`THROTTLE=devtools`). It is harsher and closer to a real phone.
- `tools/bundle.mjs` gives the first-load and per-chunk gzip sizes and the biggest modules.
- `tools/trace.mjs` runs a 4x CPU trace through 11 transitions, with Event Timing (INP) and React commits per transition.

## Before → after

| Mobile, Slow 4G, 4x CPU                       |            Before |               After | Target  |
| --------------------------------------------- | ----------------: | ------------------: | ------- |
| Home, first visit: LCP (applied)              |            2.65 s |          **2.16 s** | ≤ 2.5 s |
| Home, first visit: Performance (applied)      |                92 |              **96** | ≥ 90    |
| Game, returning: LCP (applied)                |            2.63 s |          **2.17 s** | ≤ 2.5 s |
| Tablet UI, first visit: LCP (applied)         |            3.48 s |          **2.55 s** | ≤ 2.5 s |
| Tablet UI, first visit: Performance (applied) |                84 |              **94** | ≥ 90    |
| Lighthouse Performance (simulated), all steps |               100 |                 100 | ≥ 90    |
| LCP (simulated): home / game / tablet         | 0.90 / 1.50 / 1.20 s | 0.90 / 1.36 / 1.21 s | ≤ 2.5 s |
| TBT, every step                               |              0 ms |                0 ms | < 200 ms |
| CLS, worst step                               |             0.014 |               0.014 | ≤ 0.1   |
| INP, played round (Lighthouse timespan)       |             41 ms |               41 ms | ≤ 200 ms |
| First-load JS (gzip)                          |  153.2 KB, 6 files | **139.3 KB**, 12 files | ≤ 145 KB (CI) |
| CSS (gzip)                                    |           16.6 KB |             16.7 KB | ≤ 20 KB |
| All JS incl. lazy chunks (gzip)               |          215.4 KB |            224.0 KB | —       |
| Precache                                      | 50 entries, 1103.5 KiB | 40 entries, 872.9 KiB | —  |
| Long tasks in the 11-transition trace         |                 0 |                   0 | —       |
| Slowest interaction in the trace (Event Timing) |           32 ms |               48 ms | ≤ 200 ms |

Notes:
- First-visit transfer rose from 272 KB to 282 KB. The extra bytes are Setup, the streak overlay and the layout/drag
  motion features, fetched when idle after LCP so the next tap never waits. The bytes before LCP fell by about 14 KB of
  JS plus 76 KB of fonts.
- The trace's slowest interaction moves between 32 and 48 ms from run to run on the same build: Event Timing rounds
  to 8 ms, and the machine was shared. Ten A/B pairs on the polish commits showed no difference either way.
- Tablet LCP misses 2.5 s by 50 ms only under applied throttling; see the backlog.

## Root causes found, ranked by evidence

1. **The first paint was gated by bytes on Slow 4G, not CPU.** The waterfall showed every request starting at
   583 ms and sharing the link. LCP landed just after the last big file, so every KB cut before LCP saved about
   5.4 ms (at 184 KB/s). There were 0 long tasks and 0 forced layouts, and TBT was 0.
   - **76 KB of preloaded fonts with `font-display: block`** held text back: the biggest single item.
   - **framer-motion's full `motion` component** put every feature in the first load: layout projection, drag, all
     gestures (40 KB gzip on its own).
   - **Screens the first screen never shows were in the entry chunk:** Setup, and the streak overlay.
2. **The tablet UI downloaded in a waterfall.** The desk chunk graph was requested only after the entry had run,
   one extra round trip of about 0.6 s.
3. **The lab hid real behaviour.** `vite preview` speaks HTTP/1.1, whose six connections per host penalised split
   chunks. Production is HTTP/2 behind Cloudflare, so the lab was moved to HTTP/2 and re-baselined.
4. **Hosting (not in this repo):**
   - Cloudflare serves hashed assets gzip, not brotli.
   - `sw.js` is cached for 4 h at the edge (`max-age=14400`, from Cloudflare's Browser Cache TTL), so a deploy can
     take hours to reach installed apps.
5. **Paint cost on animated and scrolling layers:**
   - a 64 px blur filter on the always-scaling ambient glow
   - invisible backdrop blurs under 95%-opaque sheets
   - rAF-driven shimmer and spinner on the main thread.
6. **Re-renders were checked and are not a problem.** About 60 components render per commit, half of them
   framer-motion wrappers, and every interaction stays at or under 48 ms at 4x CPU. No memoisation was added.
7. **An intermittent e2e failure was a real UX bug.** On a first visit, "Ready to work offline" replaced
   "Signed in as …" after under a second, because there is one toast slot.

## Changes (commits on main, not pushed)

**Phase 0, tools:**
- `1129895`: Lighthouse user flow, bundle breakdown, interaction profiling
- `f6149ec`: baseline
- `9ba74a0`: HTTP/2 lab and re-baseline

**Phase 1, performance:**
- `c52bc59`: an inline `<head>` check modulepreloads the desk chunks on large screens. Tablet LCP 3.48 → 2.83 s.
- `9f363ca`: `LazyMotion` (strict) with `m` components. `domAnimation` loads synchronously and `domMax` at idle.
  First-load JS 153.2 → 145.0 KB.
- `69b0a54`: Setup and the streak overlay are lazy, prefetched at idle. 145.0 → 139.1 KB.
- `40e6d8b`: fonts use `font-display: swap` and are no longer preloaded. LCP 2.58 → 2.25 s, CLS 0.001.
- `77d3e89`: `npm run perf:budget` in CI, failing over `tools/budget.json`. `perf:lighthouse` and `perf:trace` for
  local checks.
- `0ef6eac`: avatar photos use `loading="lazy"`.

**Phase 2, PWA:**
- The install icons are out of the precache (50 → 40 entries, 1103 → 873 KiB).
- Player photos are cache-first in the service worker: versioned and public, 200 entries, 30 days. No private API JSON
  is cached by the service worker.
- An open tab checks for updates when it returns to the front and hourly, and still only prompts.
- The manifest has `id`, `lang` and `categories`, with an installability check (0 errors).
- Offline server screens refresh when the connection returns.
- `touch-action: manipulation` and a transparent tap highlight on the whole app.
- The inbox email field is 16 px, so iOS doesn't zoom on focus.
- Brotli 11 and gzip 9 siblings are written at build time, for nginx `brotli_static`.
- `hosting.md` has the nginx and Cloudflare settings.

**Phase 3, design and motion** (audited with web-design-guidelines, frontend-design and emil-design-eng;
review-animations is not installed):
- Paint cost:
  - The glow uses a gradient instead of a filter blur.
  - The invisible backdrop blurs are removed.
  - The shimmer and spinner are CSS animations.
- One press-feedback scale pair, `PRESS` 0.97 and `PRESS_SM` 0.92, replaces 11 ad-hoc values. 55 buttons that had no
  press feedback now have it.
- Motion:
  - Pop-ins start from 0.5, never from 0.
  - Screen exits are 0.26 s against 0.42 s entrances.
  - Reduced motion now covers the random-dealer spin.
- States:
  - Awards and Wrapped got loading and error states.
  - Activity's "Show more" shows when it is loading and offers a retry.
  - Two fields got visible focus rings.

**Phase 4:**
- `fix(pwa)`: "Ready to work offline" waits for the toast slot instead of replacing it. The signed-in e2e specs ×4
  went from 69/72 to 72/72.

**Verification on the final commit:**
- Prettier, eslint and tsc are clean.
- Vitest: 404/404.
- Playwright: 153/153.
- `perf:budget` is within budget, and a forced regression fails it with exit code 1.

## Not done, and why

- **Real devices:** nothing was run on a mid-range Android or on iOS Safari. Double-tap zoom, focus zoom, install and
  GPU paint savings are verified only in headless Chrome or by reasoning.
- **Lighthouse in CI:** it needs Chrome and is noisy on shared runners. CI enforces the deterministic bundle budget;
  `npm run perf:lighthouse` enforces LCP, TBT, CLS, INP and the score locally.
- **Hosting:** brotli at the edge, `sw.js`/manifest no-cache and the Cloudflare bypass are written up in
  `hosting.md`, not applied.

## Backlog, in priority order

1. **Hosting:** apply `hosting.md`. Bypass `sw.js` and the manifest at Cloudflare, set "Respect Existing Headers",
   purge `sw.js`, and serve the `.br` files. Brotli takes the entry from 86.7 to 66.9 KB.
2. **Tablet LCP (2.55 s applied):** make the phone shell a lazy chunk too, with the inline `<head>` check preloading
   whichever shell matches. The tablet then skips the phone screens in the entry (estimated −20 to 25 KB, about
   −130 ms).
3. **`.glass` backdrop blur on every card, including long scrolling lists.** This is the biggest remaining paint cost
   on mid-range Android. Removing it changes the tint, so it's a design call; a solid fill on list rows only would be
   a cheap option.
4. **Replace React DOM with Preact (preact/compat):** about −35 KB gzip on the first load. That's a new dependency and
   a compatibility risk, so it needs a decision.
5. **Home suit orbit:** a `useAnimationFrame` loop on the main thread whenever Home is open. Move it to a compositor
   CSS animation.
6. **Fonts:** subset or instance the variable fonts (76 KB), which needs fonttools. Optionally add metric-matched
   fallbacks so the first-visit swap doesn't shift text.
7. **Manifest:** `orientation: 'portrait'` locks tablets to portrait, which conflicts with the large-screen UI.
   Shortcuts would need the app to read a start URL.
8. **Small items:**
   - the Home hero's 1 s entrance replays on every return Home
   - the table arrow's `pathLength` probably drops its dash pattern
   - the `.spot` hover fade is 0.5 s
   - sign-out doesn't clear the photo cache
   - long lists aren't windowed past 100 rows (`content-visibility`).
