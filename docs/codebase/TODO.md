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

## Seat invites

- **A host who reloads loses "can't make it".** Declines reach the host only on the user stream
  (`seat-invite-update`, kept in memory by `sync/seatInviteSignals.ts`); the API has no host-side read of sent
  invites, so the Ishaara waiting screen forgets a decline after a reload. Needs a backend route to fix.
- **One SSE reader.** `sync/sse.ts` (user stream) and `games/ishaara/sync/events.ts` hold the same fetch-SSE loop;
  move Ishaara's onto `sse.ts`.
- **Full e2e suite not run since seat invites landed** (only `seat-invites`, `ishaara-play`, `ishaara-edges`,
  `ishaara-a11y`, `platform`, `accounts` and `sync`). `signIn` now aborts the user stream on the shared mock unless
  a test asks for it, and `onlyGame` hides seat invites.
- **Not verified:** the banner and cards on a real phone, against the real backend, and in the three other themes
  (checked in Sunset Glass at 390x844 only).
- **Ishaara's waiting screen draws clue-givers' avatars square** (`Givers` in `screens/Waiting.tsx` passes a
  className without `rounded-full`); seen while building seat invites, older than them.

## Motion

- **Check in a browser with motion on:** the winner sequence and the deal in Yerba Sun, Editorial Paper and Emerald
  Gilt; where the Kaali Teeri partner-reveal dot lands; the "everyone but one made it" line on short phones; the
  invite welcome's table in each theme.
- **Filled icons for active tabs.** The large-screen rail has them (`IconsFill.tsx`); tabs do not.
- **Invite welcome** borrows `t.streak.continue`; give it its own `t.hub.auth.welcomeContinue`.
- **Leaderboard podium, check on a real phone with motion on:** the 3rd-to-1st reveal and the first-place confetti
  were checked in desktop Chrome only (`ui/RankBoard.tsx`).
- **Ask Jay:** should Wrapped's rank count up from 0 (it counts down from the field size)? Should the deal's closing
  part be trimmed (it runs about 3.2s, 3.9s on Emerald Gilt, 4s on the last round)?

## Design audit follow-ups

What the 2026-11-15 design audit left open (finding IDs refer to the audit, kept untracked at the repo root).

- **ISH-F27, the key's alert colour:** the clue phone uses `text-key-alert` for a lost link, a refused send and the
  last ten seconds. Give each meaning its own token or mark (`screens/clue/KeyView.tsx`, `KeyParts.tsx`).
- **ISH-F19, one design system:** the clue phone still has its own buttons and panels (`screens/clue/clueKit.ts`);
  fold them into `components/ui` with the key's tokens. Avatars were not touched.
- **PL-F13, install prompt:** not built. Shared primitives got busy buttons, form errors and named swatches; check
  what else the audit listed. `platform/pages/InlineError.tsx` duplicates `FormError` in `ui/Field.tsx`: fold it.
- **Me page:** "Sync now" calls every game's sync, but Kaali Teeri's engine is only bound inside Kaali Teeri, so from
  Me it does nothing for Kaali Teeri games. The hero stats name no game.
- **Code passes:** Kachuful had no code pass in the audit (screenshots only); run one.
- **Not verified:** a real phone (keyboard, safe areas, vibrate); the new motion (A1 to A8, A10, A11) watched with
  motion on, frame by frame (e2e checks it is present); the app's new Ishaara flows against the real backend.
- **Backend:** `isHost` on Ishaara's game list is on branch `feat/design-audit` in the backend repo (from `ishaara`,
  which is itself not merged into the backend's `main`). Merge and deploy it with this branch.

## Spades

- **Offline-ready toast:** Spades isn't in `OWN_TOAST` (`platform/PlatformUpdate.tsx`), so the platform announces
  offline-readiness on its pages. Add it once table mode mounts a toast slot that announces it.
- **Brand art:** `design/brand/games/spades/` has `tile-art.svg` in Sunset Glass only; the other games keep a variant
  per theme. The app's tile draws from tokens, so this is only for the kit.
- **Budget:** `tools/bundle.mjs` and `budget.json` have no Spades first-load entry yet (plan §10). Its root chunk is
  6.3 KB gzip (2026-11-16).

## Tests

- **Yerba Sun moves Kachuful's table seats up about 10px** on the bidding screen at 360x780 (seen once
  `themes.spec.ts` loaded each theme's real stylesheet; sizes match). Themes should change paint, never geometry:
  find what in Yerba Sun's sheet shifts the table slot, then drop the excuse in that test.

## Repo

- **The installed app is portrait-only** (`orientation: 'portrait'` in the manifest in `vite.config.ts`) although
  every screen has a landscape layout. Decide whether to lift it.
