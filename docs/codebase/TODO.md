# To do

The open work for this repo, in one place. Add an item when something is left undone, and remove it when it is done
(built, tested, committed). Keep each item short: what, why it matters, and where to start.

## Performance

- **First-load budget is over, so `npm run perf:budget` and the CI check job fail.** Measured 2026-11-14: landing JS
  160.2 KB (budget 145), phone JS 159.9 KB (145), large-screen JS 186.8 KB (165), CSS 23.3 KB (22). Again on
  2026-11-16 with Spades: landing 165.0, phone 162.4, large screen 189.9, CSS 24.1. On 2026-11-17 with every game's
  achievements: landing 165.5, phone 162.8, large screen 191.1, Spades 166.5, CSS 24.2. Of the large screen's +1.2,
  about 0.6 is the shared winner's reel and catalogue now being two chunks of their own; grouping them with
  `howWon` pulled the icons in too, so it was left. Budgets are in
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
- **Budget:** Spades' first load is 165.9 KB against its 160 (2026-11-16): about 155 KB is the shared base that puts
  every page over budget (see Performance). Its own part is about 11 KB; the online table is a lazy 27.8 KB chunk.
- **Scorekeeper (table mode), left open on 2026-11-16:**
  - Two hand summaries: the scorekeeper's (`table/screens/hand/Summary.tsx`, tied to its store: edit link, haptics)
    and the online one (`ui/HandSummary.tsx`). They look alike; merge them if they drift.
  - History shows only the newest page of finished online tables (no "Load more" through `nextCursor`).
  - Not checked: the desk layout and keyboard by e2e, or a real phone.
- **Online play, left open on 2026-11-16:**
  - **Tests and audit:**
    - `spades-online-hand.spec.ts` plays one hand with motion on, but sends tricks 2–13 straight to the API, and
      plays cards by keyboard (a pointer on the overlapping fan lands on the next card). Nothing yet checks the
      "spades broken" moment, a drag to play, or a played timeout (only a bid's).
  - **The online table has only run in jsdom and Playwright** (`spades-online-hand`, `spades-responsive` at six
    phone sizes, Sunset Glass only): check it on a real phone in all four themes. At 320 px the hand's card strips
    are about 20 px, against the plan's 25 (the responsive spec allows strips under 44 px, plan §10).
  - **Reconnecting:** `src/sync/sse.ts` doesn't send `Last-Event-ID`, so after a reconnect the link relies on the
    server sending `state` when the stream opens. Confirm the real backend does.
  - **"Your turn" on Spades' home:** the backend's `SpTableSummaryOut` has no `turn`, so the home list can't show
    it. That needs a `backend-requests.md` entry.
- **Deploy and devices:**
  - Whether an iPhone's silent switch mutes the Web Audio sounds is unverified.
  - Haptics are untested on a real Android phone.
- **Seat invites:** a host who reloads loses Ishaara's "can't make it" (no host-side read of sent invites), and the
  server's circle leaves out games the user scored but didn't sit in.

## Achievements and awards

Every game has them since 2026-11-17 (plan in git history: `docs/ACHIEVEMENTS-PLAN.md` on `feat/achievements-every-game`).

- **Spades online pop names "Someone"** for a player who left the table in the moment between a hand ending and its
  pop showing: the public table no longer has their name (`progress/livePops.ts`, `PlayTable` `nameOf`).
- **Ishaara's Win reel shows 12 cards**, game finishes first, so with six players a turn's moments can fall off it
  (`screens/GameReel.tsx`).
- **Big moments pop as cards** like the rest; the full-screen unlock card is wow-moments M1.
- **Mock API:** Kaali Teeri and Spades uploads answer `earned: []` (the real server returns the rows; the app reads
  them only for Kachuful), and the other games' feeds carry achievements but no `game_finished` items.
- **Not verified against the real backend:** the Me page's per-game counts and the every-game feed (mock API only).

## Tests

- **Yerba Sun moves Kachuful's table seats up about 10px** on the bidding screen at 360x780 (seen once
  `themes.spec.ts` loaded each theme's real stylesheet; sizes match). Themes should change paint, never geometry:
  find what in Yerba Sun's sheet shifts the table slot, then drop the excuse in that test.

## Repo

- **The installed app is portrait-only** (`orientation: 'portrait'` in the manifest in `vite.config.ts`) although
  every screen has a landscape layout. Decide whether to lift it.
