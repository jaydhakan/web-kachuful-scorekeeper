# To do

The open work for this repo, in one place. Add an item when something is left undone, and remove it when it is done
(built, tested, committed). Keep each item short: what, why it matters, and where to start.

## Performance

- **First-load budget is over, so `npm run perf:budget` and the CI check job fail.** Measured 2026-11-13: landing JS
  160.1 KB (budget 145), phone JS 159.7 KB (145), large-screen JS 186.7 KB (165), CSS 23.1 KB (22). Budgets are in
  `tools/budget.json`. Start with the shared chunk, which holds Kachuful's store next to `persistence.ts` and the
  API client.

## Platform (Baithak)

The name Baithak is final for now (decided 2026-11-13). The full platform plan is in git history:
`git show 394db84:docs/PLATFORM-PLAN.md`.

- **Art:** theme-aware tile art beyond the landing tiles, and Kachuful's preview image redrawn (plan §7).
- **Renames, on hold while the name is "final for now":** session cookie and CSRF header to neutral names (everyone
  signs in once more), backend and package names, then the repos and folders; the database, server paths and service
  name are optional (plan §12). Backend changes go through `backend-requests.md`.

## Motion

- **Check in a browser with motion on:** the winner sequence and the deal in Yerba Sun, Editorial Paper and Emerald
  Gilt; where the Kaali Teeri partner-reveal dot lands; the landing tile's square cover against its rounded corners;
  the "everyone but one made it" line on short phones; the invite welcome's table in each theme.
- **Filled icons for active tabs.** The large-screen rail has them (`IconsFill.tsx`); tabs do not.
- **Invite welcome** borrows `t.streak.continue`; give it its own `t.hub.auth.welcomeContinue`.
- **Ask Jay:** should Wrapped's rank count up from 0 (it counts down from the field size)? Should the deal's closing
  part be trimmed (it runs about 3.2s, 3.9s on Emerald Gilt, 4s on the last round)?

## Repo

- **`references/`** (about 330 tracked files: design round 2 and Kaali Teeri's house rules) was to be deleted once
  both new games shipped, and they have. Ask Jay before deleting; it stays in git history either way.
- **`reports/`** still tracks before/after images and audits from finished work (`reports/responsive/`,
  `reports/perf/before|after*`). Keep `reports/perf/REPORT.md` and `hosting.md` (the code points at the latter);
  the rest can probably go.
- **The installed app is portrait-only** (`orientation: 'portrait'` in the manifest in `vite.config.ts`) although
  every screen has a landscape layout. Decide whether to lift it.
