# To do

The open work for this repo, in one place. Add an item when something is left undone, and remove it when it is done
(built, tested, committed). Keep each item short: what, why it matters, and where to start.

## Performance

- **First-load budget is over, so `npm run perf:budget` and the CI check job fail.** Measured 2026-11-14: landing JS
  160.2 KB (budget 145), phone JS 159.9 KB (145), large-screen JS 186.8 KB (165), CSS 23.3 KB (22). Budgets are in
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
- **Leaderboard podium, check on a real phone with motion on:** the 3rd-to-1st reveal and the first-place confetti
  were checked in desktop Chrome only (`ui/RankBoard.tsx`).
- **Ask Jay:** should Wrapped's rank count up from 0 (it counts down from the field size)? Should the deal's closing
  part be trimmed (it runs about 3.2s, 3.9s on Emerald Gilt, 4s on the last round)?

## Tests

- **Kachuful's theme-layout test never loads the other themes' stylesheets.** `themes.spec.ts` "every theme lays
  the bidding screen out identically" only sets `data-theme`, so Yerba Sun, Editorial Paper and Emerald Gilt are
  measured without their own rules and faces. Switch it to `showTheme` (as the Ishaara test does) and expect width
  slack for pills sized by their label.
- **Broken-word check covers Ishaara only** (`e2e/audit-rules.ts`). Extend it to every screen once KF-F01 and
  KT-F03 (names broken mid-word) are fixed.
- **Ishaara's known bugs are listed in the specs** (`ISH_KNOWN` in `responsive.spec.ts` and `targets.spec.ts`,
  `test.fail` for ISH-F04 and PL-F02, the Yerba Sun excuse in `themes.spec.ts`). Each fix deletes its entry.

## Repo

- **The installed app is portrait-only** (`orientation: 'portrait'` in the manifest in `vite.config.ts`) although
  every screen has a landscape layout. Decide whether to lift it.
