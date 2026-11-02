# TODO: pending work (handover, 2026-11-02)

For a fresh chat. Read `CLAUDE.md` first (rules), then `docs/codebase/DESIGN-SYSTEM.md` (themes, materials, motion)
and `reports/perf/REPORT.md` (how speed is measured). Report progress to Jay as a percentage after each step.

## Where things stand

- `main` has the performance pass (2026-11-01) and the three-theme redesign (Sunset Glass default, Yerba Sun,
  Editorial Paper; admin Appearance switcher; hero Bidding/Playing; motion), up to `761434b`. Nothing is pushed.
- Since then Jay added `8a169ad` (Setup: decks and direction in an "Advanced" section), `23229c3` (grain and
  ambient layers promoted) and `b76fdce` (Credits page). Re-read those before touching Setup, Home or `index.css`.
- Last verified at `761434b`: unit 443/443, e2e 158/158, Lighthouse 100 on every step (LCP 0.90 s phone).
- The backend team is building the appearance endpoints in `backend-requests.md`. When they land, check the shapes
  against their `HANDOFF.md` and test Admin › Appearance against a real server (`src/state/theme.ts`,
  `src/sync/endpoints.ts`: `appearance`, `setAppearance`, `setMyTheme`).

## 0. CSS is over budget (CI fails) — do first

`node tools/bundle.mjs` now reports CSS 23.3 KB gzip against `tools/budget.json` `cssKb: 22`, so
`npm run perf:budget` (a CI step) fails. It was 21.7 KB at `761434b`; the newer commits added the rest. Find what grew
(`git diff 761434b -- src/styles tailwind.config.ts`, new Tailwind classes from the Credits page) and trim it, or, if
the growth is justified, raise the budget with Jay's OK and a one-line reason in the commit. First-load JS is 144.3 of
145 KB, so item 2 matters for headroom too.

## 1. Hosting settings — Jay does this (no code)

Why: Cloudflare caches `sw.js` for 4 hours, so a deploy can take hours to reach installed apps; and assets go out
as gzip level 1 instead of the brotli files the build already writes (entry 86.7 KB → 66.9 KB). Full detail and the
nginx block: `reports/perf/hosting.md`. The site file is `/etc/nginx/sites-available/play` (Certbot-managed).

1. Deploy: `npm run build`, upload the whole `dist/` (including the `.br` and `.gz` files).
2. nginx, on the server:
   1. `sudo cp /etc/nginx/sites-available/play /root/play.nginx.bak2`
   2. `sudo grep -n "root\|location /" /etc/nginx/sites-available/play` — note the current `root`.
   3. `sudo apt install -y libnginx-mod-http-brotli-static`
   4. `sudo nano /etc/nginx/sites-available/play`: inside the `listen 443 ssl` server block, paste the nginx block
      from `hosting.md`. Keep the existing `root` instead of `/var/www/kachuful/dist`; replace any existing
      `location / { … }` rather than adding a second one.
   5. `sudo nginx -t && sudo systemctl reload nginx`. On failure:
      `sudo cp /root/play.nginx.bak2 /etc/nginx/sites-available/play && sudo systemctl reload nginx`. If only
      `brotli_static` fails, delete that line and retry.
3. Cloudflare (play.vectanix.com zone):
   1. Caching → Cache Rules → Create: URI Path is in `/sw.js`, `/manifest.webmanifest` → **Bypass cache**.
   2. Caching → Configuration → Browser Cache TTL → **Respect Existing Headers**.
   3. Purge Cache → Custom Purge → `https://play.vectanix.com/sw.js`.
4. Check:
   ```sh
   SITE=https://play.vectanix.com
   JS=$(curl -s $SITE/ | grep -o '/assets/index-[^"]*\.js' | head -1)
   curl -sI -H 'Accept-Encoding: br, gzip' "$SITE$JS" | grep -iE '^(content-encoding|cache-control|cf-cache-status)'
   curl -sI "$SITE/sw.js" | grep -iE '^(cache-control|cf-cache-status)'
   ```
   Expect `content-encoding: br` and `cache-control: no-cache`. If assets still come back gzip, add a Cloudflare
   Compression Rule for `/assets/*` set to Brotli (see `hosting.md` step 4).

The new chat can only guide this and read back the `curl` output Jay pastes.

## 2. Split the phone UI out of the main bundle — code, approved

Goal: tablets stop downloading the phone screens (tablet LCP was 2.55 s under applied throttling, target ≤ 2.5 s),
and first-load JS gets headroom under the 145 KB budget.

- Today `src/components/AppShell.tsx` renders `PhoneShell` (statically imported Home, Bidding, Play, Results,
  RoundStart, Summary, sheets…) or lazy `DeskShell`. The `preloadDesk` plugin in `vite.config.ts` injects an inline
  `<head>` script that modulepreloads the desk chunk graph when `matchMedia(MQ.big)` matches.
- Plan: make `PhoneShell` its own lazy chunk too, and change the head script to modulepreload whichever shell matches
  (phone when `MQ.big` doesn't match). Without the phone preload, phones would pay an extra round trip before first
  paint — the exact regression the desk preload fixed (reports/perf/REPORT.md, root cause 2).
- `tools/bundle.mjs` computes "first load" from the entry's static imports. Once the phone shell is lazy, report and
  budget the phone first load as entry + phone shell closure (and the desk one likewise), or the budget silently
  stops covering phones.
- Verify: `npm run perf:budget`; `THROTTLE=devtools RUNS=3 node tools/lighthouse.mjs` before and after (phone LCP must
  not regress from ~2.16 s applied / 0.90 s simulated; tablet should improve); `npm run verify`; full
  `npx playwright test` (158 tests; `e2e/large-screen.desktop.spec.ts` and `e2e/themes.spec.ts` matter most).
  Commit as `perf(...)` with the before/after numbers in the message.

## 5. Home's orbiting suits off the main thread — code, approved

- `src/screens/Home.tsx` moves four suits round the wordmark with `useAnimationFrame` (JS every frame): an ellipse
  with radii 0.43 × box width and 0.41 × box height, a 9 s lap, scale `0.85 + 0.25·sin(a)`, opacity 1 in front and 0.5
  behind (z-index 3/0, switched twice a lap), suits a quarter-lap apart. Reduced motion places them once at the
  quarter points and stops. A `ResizeObserver` feeds the box size.
- Replace it with a CSS (compositor) animation that looks the same: e.g. nested elements, one animating X with a
  cosine-like ease and one Y with the same timing offset by a quarter lap (negative `animation-delay`), radii in
  container units on the orbit box, scale and the front/back opacity as keyframes. z-index can't run on the
  compositor; get the in-front/behind look from opacity, or keep a cheap two-state switch.
- Rules: transform and opacity only; `src/test/motion.guard.test.ts` rejects transitions of custom properties and
  layout keyframes. Reduced motion: static at the quarter points. Check all three themes by screenshot (the text glow
  uses `--glow`) and that `npm run perf:trace` shows no new long tasks.

## Decisions still open (ask Jay)

- **3. Frosted-glass blur on list cards (Sunset Glass only).** Recommendation: keep it; if people report lag, expose
  the existing hidden "Lite" mode (`<html data-lite>` drops every blur) as a "Reduce effects" toggle.
- **4. React DOM → Preact (~35 KB less).** New dependency with compatibility risk for framer-motion. Recommendation:
  skip unless load speed becomes a problem; item 2 recovers headroom more safely.

## How to check work here

- `npm run verify` (prettier, eslint, tsc, vitest) — check the exit code, not just that a summary printed.
- `npx playwright test` builds and serves on port 4173. Don't run another Playwright job at the same time: both write
  `test-results/` and traces go missing (`ENOENT`).
- A test that closes a sheet and then navigates must wait for the dialog to go first: closing steps the history back,
  which aborts an immediate `goto`/`reload` (fixed in `targets.spec.ts` and `responsive.spec.ts`).
- Screenshots per theme: `SHOT_PORT=5199 SHOT_THEME=<id> SHOT_DEVICES=p360,p412 SHOT_DIR=screenshots/after/<id>
  npx playwright test -c tools/screens tools/screens/screens.spec.ts`; quick single views:
  `tools/screens/quick.spec.ts`; signed-in screens against the mock: `tools/screens/admin.spec.ts` (needs
  `npm run dev:mock` on the port given by `SHOT_PORT`). Don't edit `src/` while a capture runs: the dev server
  hot-reloads mid-run.
- New UI uses the theme tokens and `.mat-*` materials and must work in all three themes (`DESIGN-SYSTEM.md`).
- Commits: Conventional Commits, one concern each, as `CLAUDE.md` says (no co-author trailer); never push unless Jay
  asks.
Check Credits Screen and add real names and instas