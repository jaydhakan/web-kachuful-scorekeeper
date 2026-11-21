# To do

The open work for this repo, in one place. Add an item when something is left undone, and remove it when it is done
(built, tested, committed). Keep each item short: what, why it matters, and where to start.

## Performance

- **First-load budget is over, so `npm run perf:budget` and the CI check job fail.** Measured 2026-11-14: landing JS
  160.2 KB (budget 145), phone JS 159.9 KB (145), large-screen JS 186.8 KB (165), CSS 23.3 KB (22). Again on
  2026-11-16 with Spades: landing 165.0, phone 162.4, large screen 189.9, CSS 24.1. On 2026-11-17 with every game's
  achievements: landing 165.5, phone 162.8, large screen 191.1, Spades 166.5, CSS 24.2. Of the large screen's +1.2,
  about 0.6 is the shared winner's reel and catalogue now being two chunks of their own; grouping them with
  `howWon` pulled the icons in too, so it was left. After every wow moment (2026-11-18): landing 165.6, phone 162.9,
  large screen 189.7, Spades 166.6, CSS 24.4; the moments themselves are one lazy chunk with their own sheet
  (`src/fx/ui`). After smooth navigation (2026-11-18): landing 166.9, phone 164.0, large screen 191.2, Spades 168.3,
  CSS 25.0 (the preload helper, the page hold, progress bar and boot skeleton). After sound (2026-11-18): landing
  170.2, phone 167.3, large screen 194.6, Spades 171.6, CSS 25.0; the +3.3 is `fx/feedback`, `sequence`, `pitch`,
  `podiumCues`, the quick mute and each game's cue plans; the synth is a lazy 6.2 KB chunk. The full motion features (~12 KB,
  `motionMax`) now load beside the first page, before the first render, to fix stuck exits; `tools/bundle.mjs` does
  not count that chunk, as it is a dynamic import, so the real first load is ~12 KB more than it reports. Budgets are in
  `tools/budget.json`. Start with the shared chunk, which holds Kachuful's store next to `persistence.ts` and the
  API client. After rewards (2026-11-21, `feat/rewards` against `main`): landing 182.3 (+12.0), phone 179.3 (+11.8),
  large screen 210.4 (+16.1), Spades 184.2 (+12.2), CSS 25.4 (+0.4). Nearly all of it is `shell-common`, which both
  Kachuful shells and React share, so the landing page loads it too: `kachuful/state/medals.tsx` (8 KB minified),
  `fx/moments.tsx`, banter (strings and rule table), `domain/medals.ts`, `domain/night.ts`, `SeatName`, `kursi.ts`,
  `intel.ts`. The festival dressing is lazy (`fx/ui/FestivalTableLazy.tsx`). The fix is structural: React and the
  vendor code in a chunk of their own, so the landing page stops loading Kachuful's shared code.

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

## Sound

Sound for Kachuful and Kaali Teeri is built (`src/fx`, `docs/codebase/ARCHITECTURE.md`, "Sound and haptics").

- **Jay to approve the recipes on the Sound Board** (`npm run dev`, then `/?lab=moments&tab=sounds`). Nobody has heard them yet: tune a recipe in `fx/sound.ts` and replay from the board.
- **Real-phone check:** a real game of each on Android, and on an iPhone with the silent switch on (does it mute, as the Me page says?). Also: volume against a table's talk on a phone speaker at mid volume, and the made-result run with 8+ players (if it sounds busy, play it as one chord).
- **Sound, not covered or not done:**
  - No e2e for Kachuful's hook, the last-round `bell`, the reveal's made/missed run with motion on, or Kaali Teeri's winner and 1000 `bell` (unit tests cover their plans).
  - The forbidden-bid `knock` can't be tapped on a phone (the key is natively disabled); it fires only from the desk keyboard path.
  - A live spectator who never taps stays silent: audio unlocks on the first tap and the live pages don't call `armAudio`.
  - Kachuful's Summary has no tap-to-skip, so the plan's `settle` crown is built but unused there; the Sound Board's sequences are hand-copied timings, not the games' own plans.
- **Late-night quiet** (decided "on" in REWARDS-PLAN, not built): sounds drop a level after a set hour. Not part of this task.

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
    - `spades-online-hand.spec.ts` plays one hand with motion on, but sends tricks 2–13 straight to the API.
      Nothing yet checks the "spades broken" moment, a drag to play, or a played timeout (only a bid's).
  - **The online table has only run in jsdom and Playwright** (`spades-online-hand`, `spades-responsive` at six
    phone sizes, Sunset Glass only): check it on a real phone in all four themes. At 320 px the hand's card strips
    are about 20 px, against the plan's 25 (the responsive spec allows strips under 44 px, plan §10).
  - **Reconnecting:** `src/sync/sse.ts` doesn't send `Last-Event-ID`, so after a reconnect the link relies on the
    server sending `state` when the stream opens. Confirm the real backend does.
  - **"Your turn" on Spades' home:** the backend's `SpTableSummaryOut` has no `turn`, so the home list can't show
    it. That needs a `backend-requests.md` entry.
- **Spades playtest fixes, built 2026-11-19 (nothing checked on a real phone):**
  - Play a real four-phone game on iPhone and Android: the freeze fixes (resync on return, 15 s watchdog, summary
    closing on the next deal), tap-to-play, the bid pad on a short phone, and the win/loss lines.
  - Check the white card faces' hairline edge on Editorial Paper, and the drop slot and "Your turn" pill in the light
    themes (only the default theme was looked at).
  - Production logs: look for `live viewer queue full` around the 2026-11-18/19 playtest; it confirms or rules out the
    backend cause fixed by the queue change (backend branch `fix/live-queue-newest`, not yet deployed).
  - The bid pad still covers part of the side seats on short felts (the strip carries every bid); the partner seat
    is asserted uncovered only at 390x844 and 430x932.
  - Auto-play of a lone legal card (setting) has only fake-timer unit tests, no e2e.
  - Live hardening (backend branch `fix/live-queue-newest`, deploy it before the app change that reads a ping's `rev`):
    check on the server that Postgres `max_connections` covers `(DB_POOL_SIZE + DB_MAX_OVERFLOW) x workers + 2` (82 with
    the new defaults and 2 workers), then play a real game and look for `live viewer queue full`, `live listener
connected` and slow-load warnings in the journal. Multi-worker behaviour is covered by design, not by a test.
  - After a stream drops, seat presence refreshes only on the next `seat-presence` frame; confirm the real server
    resends it when a stream opens.
- **Deploy and devices:**
  - Confirm the frontend deploy is live (`/spades` once answered with the generic "Baithak" title): find how it deploys.
  - nginx needs SSE settings for `/api/me/events` and `/api/spades/tables/*/events` (buffering off, a 1-hour read
    timeout), or online Spades and invites stall on production. The config is in neither repo.
  - Play a real 4-phone Spades game on production, in all four themes.
  - Whether an iPhone's silent switch mutes the Web Audio sounds is unverified.
  - Haptics are untested on a real Android phone.
- **Phone notifications (idea):** Web Push for "It's your turn" and "X invited you" (`pywebpush` already approved;
  iPhone only in the installed PWA).
- **Seat invites:** a host who reloads loses Ishaara's "can't make it" (no host-side read of sent invites), and the
  server's circle leaves out games the user scored but didn't sit in.

## Achievements and awards

Every game has them since 2026-11-17 (plan in git history: `docs/ACHIEVEMENTS-PLAN.md` on `feat/achievements-every-game`).

- **Spades online pop names "Someone"** for a player who left the table in the moment between a hand ending and its
  pop showing: the public table no longer has their name (`progress/livePops.ts`, `PlayTable` `nameOf`).
- **Ishaara's Win reel shows 12 cards**, game finishes first, so with six players a turn's moments can fall off it
  (`screens/GameReel.tsx`).
- **Mock API:** Kaali Teeri and Spades uploads answer `earned: []` (the real server returns the rows; the app reads
  them only for Kachuful), and the other games' feeds carry achievements but no `game_finished` items.
- **Not verified against the real backend:** the Me page's per-game counts and the every-game feed (mock API only).

## Wow moments

All of them were built by 2026-11-18. The plan was a working doc and is deleted; the grammar, tiers and every moment
are in DESIGN-SYSTEM.md (Motion, items 15–18, and "Moments"), and each moment is in the dev-only lab at
`/?lab=moments`.

- **Not verified on a device:** a DevTools recording of Boston, the unlock card and the trap on a mid-range Android
  phone (no frame over 50ms), and a look on an iPhone (and whether its silent switch mutes the Web Audio sounds).
- **e2e can't bring about** an online Boston, the last trick that decides a hand, or spades breaking: they depend on
  the deal. Covered by unit tests of their triggers (`online/table/present.test.ts`) and the lab; the scorekeeper's
  Boston, Blind Nil and emoji rain are covered by e2e. A mock control that deals a chosen hand would cover the rest.
- **The lab's 0.25×** slows Web Animations, waits and confetti, not Framer springs (the crown, the small cards).
- **CSS first load is 163 bytes (gzip) over `main` before the moments** (the crown, podium light, season card and
  Kaali Teeri's stamps on first-load screens); the moments' own code and sheet are lazy (`src/fx/ui`).
- **Sign-in on iPhones:** fixed 2026-11-18 (the session was lost when sign-in returned to the landing page or
  another game; Safari's quick `history.go` raced Kachuful's unmount). The e2e suite runs on Chromium only, which
  never hit the race; consider a WebKit project for `accounts.spec.ts` (needs `npx playwright install webkit` in CI).

## Smooth navigation

- **Not verified on a real phone:** the page hold, crossfade, progress bar and boot skeleton were measured in Chromium
  with 4x CPU and slow-4G throttling (Pixel 5 size) and seen at desktop size; check them on an Android phone and an
  iPhone, in all four themes (only Sunset Glass was looked at).
- **A game's own address has no outline at a cold start** (`/kachuful`, `/kaali-teeri`, …): it shows the theme's
  background until the game paints. Each game's Home could get its own `.boot` variant in `index.html`.
- **Ishaara's table outline is one shape (the 5x5 board)**; its waiting screen looks different. Pick the shape from
  the table's last known status if that is worth it.

## Rewards (branch `feat/rewards` in both repos, REWARDS-PLAN.md)

Built for Kachuful so far: medals (Badshah, Wazir, Senapati), the Kursi, Aaj ka Sitara, the Legend, banter with a
"Table banter" switch, the chase, the end-of-game takeover, the table intel line, avatar moods, the moment budget's
downgrade, per-game cap and nightly crown cap; faces on the Spades scorekeeper and Ishaara's clue card.

- **Not checked on a real phone or with motion on frame by frame** (e2e covers presence, reduced motion).
- **Other games:** medals, Kursi, Sitara and banter are Kachuful's only; the plan copies them to the other games after a
  real night with Kachuful. The Kursi rule is game-agnostic (`src/progression/kursi.ts`, teams included).
- **Live page:** a signed-in spectator sees the medals and the Kursi on the standings; banter isn't shown, and a
  signed-out spectator sees none (`GET /api/medals` needs a sign-in; a public read would be a backend request).
- **Stat crowns (§6.2):** live under the name on Kachuful's player page only; the other games' player pages have no
  progression env yet.
- **Festival days (`src/fx/festival.ts`):** Kachuful's round 1 deal only. Lunar dates are listed through 2028 (Eid's
  tentative): add 2029's before the end of 2028.
- **"Last game of the night"** toggle and its long ceremony wait for the stage bust (art).
- **Crown news (backend-requests §6), app side:** the banner on the other phones (`components/crowns/CrownNews.tsx`),
  bounty chips on Kachuful's winner screen, crown and night rows in the feed, and round 1's "Beat Riya: +40 🪙".
  Not checked in a browser: the winner screen's chips and round 1's bounty line (unit tests only), the banner in the
  three other themes and on a tablet or laptop. The mock sends Kursi changes and bounties only (no medal, Sitara or
  Legend changes), and the crown banner and the invite banner share the top of the screen (the crown one is above).
- **Moment budget (§13):** a second tap finishing a beat sequence is built only where it was (Kachuful's summary);
  the other sequences are under a second. Everything else in §13 is built (holds, round cap, cooldown, crown cap).
- **Sikke (G3):** the wallet on Me and the player page, the ledger sheet, and "+🪙" on every game's winner screen
  (`components/sikke/GameSikke.tsx`). Only the Me wallet has an e2e; the winner strips have unit tests. The mock API pays
  Kachuful only (finish, win, achievements). Levels and prices still need checking against the backfill
  (`recompute-sikke --dry-run` on production data).
- **Kachuful PUT over budget (backend `make perf`, 2026-11-21):** p95 254 ms against 120 on the 5,000-game load set
  (was 438). Per-round PUTs are ~21 ms; a game's end replays the whole Kursi chain and bounties (`_rewards` in
  `services/games.py`), which grows with ended games (~5% of this at 500). Left for now (Jay); the fix is a fast path
  that steps the stored Kursi forward when the ended game is the newest, with a parity test against the replay.
- **Nights (backend-requests §7), app side:** the server's Wrapped on `NightPage` (`?open=night&id=`), Your nights
  with End the night, and "Your night is ready" on Me and the landing page. The mock groups every game as one
  table. `e2e/rewards-responsive.spec.ts` covers them on phones, a tablet and a laptop. `e2e/nights.spec.ts` skips on a
  reused mock server once tonight was ended (every recent game joins that night).
- **Giant Killer** achievement (beat the Badshah without a medal) needs a golden fixture first; not built.
- **Art waits on Jay:** the stage bust, frames and the Wardrobe (G0's style sheet comes first).

## Tests

- **Backend backup test fails on this laptop:** `pg_dump` here is 14, the dev Postgres 16; install the 16 client.
- **Yerba Sun moves Kachuful's table seats up about 10px** on the bidding screen at 360x780 (seen once
  `themes.spec.ts` loaded each theme's real stylesheet; sizes match). Themes should change paint, never geometry:
  find what in Yerba Sun's sheet shifts the table slot, then drop the excuse in that test.

## Repo

- **The installed app is portrait-only** (`orientation: 'portrait'` in the manifest in `vite.config.ts`) although
  every screen has a landscape layout. Decide whether to lift it.
