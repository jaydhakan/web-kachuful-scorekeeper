# Kachuful app (frontend): online play build plan

_For this repo. Written 2026-10-31 from decisions made with Jay. The backend is built separately (FastAPI + Postgres) from `plan-backend.md`. **Its §6 is the API contract and §8 the achievements catalogue; this plan follows both exactly.** Everything in `CLAUDE.md`, `CONTRIBUTING.md` and `docs/codebase/*` still applies._

---

## 1. Goal

Add sign-in, sync, history, leaderboards, player stats, achievements and sharing, **without changing what a signed-out phone does**. Signed out, the app works fully offline and never touches the network. Signed in, everything also syncs to the server.

Every feature ships on both UIs (phone screens in `src/screens`, large-screen screens in `src/screens/desk`). Every feature has loading, empty, no-results, offline and error states, meets the accessibility rules, and animates only `transform`/`opacity` with a reduced-motion fallback.

## 2. Decisions that shape the app (full list: `plan-backend.md` §2)

| Topic           | Decision                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in         | Email + password. **No sign-up screen.** Accounts come from invite links (`/?invite=<token>`) that the admin (Jay) copies and shares. Forgot password: "Ask Jay for a reset link" (`/?reset=<token>`).                                                                                                                                                                                   |
| Password rule   | At least 3 characters, no spaces. Hint text says exactly that; nothing else is checked.                                                                                                                                                                                                                                                                                                  |
| Online          | Signed in = every game syncs. Signed out = local only.                                                                                                                                                                                                                                                                                                                                   |
| Old local games | On first sign-in: "12 games on this phone. Add them to your account?" **Add all / Choose / Not now**.                                                                                                                                                                                                                                                                                    |
| Player names    | Globally unique (case-insensitive). Adding an existing name shows **"Is this the same Riya?"** with that player's emoji, full name, who added them and their game count. **Yes** links; **No** asks for another name (suggesting "Riya S" from a last name). It's a one-time step per scorer and name.                                                                                   |
| Boards          | **Global** (every player name, signed-in viewers) and **This device** (local, works signed out). Ranges: Today · Last 7 days · This month · Last month · All time · Custom. **Default sort: average points per round** (shown as a whole number). Ranked players need **more than 10 / 25 / 50 rounds** (Today / 7 days / longer ranges); everyone else is listed greyed out below them. |
| Visibility      | Signed-in users see all games.                                                                                                                                                                                                                                                                                                                                                           |
| Counting        | Every confirmed round counts. Wins and places count when a game ends (finished, End game, or 24 h idle).                                                                                                                                                                                                                                                                                 |
| Sharing         | Live table link and recap link, openable by anyone with the link (no login).                                                                                                                                                                                                                                                                                                             |
| Dependencies    | **None planned.** Plain `fetch`, plain IndexedDB, `EventSource`, hand-built date picker and charts. Anything else gets asked first.                                                                                                                                                                                                                                                      |

---

## 3. User journeys (what must feel right)

1. **Signed-out table night (unchanged, plus more):** play as today. The finished game is now **kept in History** instead of being replaced. The device leaderboard, player pages and achievements all work from this phone's games.
2. **Jay invites Riya:** Admin → Invite → enter her email, optionally link an existing player "Riya" → copy the link → WhatsApp.
3. **Riya opens the link:** she sees her email, "Is this you? 🦊 Riya, 12 games" (or creates her player), sets a password and is signed in.
4. **A signed-in scorer runs a game:** setup suggests people from the registry. Typing a new name that already exists triggers the same-person card. Each confirmed round syncs quietly, with a cloud icon showing its state. Offline is fine: it syncs later.
5. **Achievements light up live:**
   - Big moments get the full-screen burst (built on today's streak celebration).
   - Smaller ones get a badge pop.
   - The Winner screen plays an achievement reel.
6. **After the game:** "Share recap" makes a link with a WhatsApp preview. "Share live" at the start of a game lets everyone follow from their own phones.
7. **Next day:** Home shows Today's awards, your global rank with its movement, and an activity feed. Tap through to the leaderboard, a player page, head-to-head or this month's season.

---

## 4. Architecture changes

### 4.1 Layers (existing rules kept)

| Layer               | New                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain` (pure) | `timeline.ts` (per-round scores and runs), `leaderboard.ts`, `playerStats.ts`, `h2h.ts`, `achievements/` (catalogue + engine), `awards.ts` (daily), `seasons.ts`, `wrapped.ts`, `validate.ts` (mirror of the server's checks), `names.ts` (`nameKey`, suggestions), `ranges.ts` |
| `src/state`         | Schema v3 migration. `archive.ts`: **the only IndexedDB access**, mirroring how `persistence.ts` is the only `localStorage` access. New state slices: `nav` (stack), `session`, `sync`. Actions for each.                                                                       |
| `src/sync` (new)    | `api.ts` (fetch wrapper: `credentials: 'same-origin'`, `X-Kachuful: 1`, error mapping to the contract's codes), `outbox.ts`, `engine.ts` (push/pull loop), `live.ts` (`EventSource` with reconnect). **The only network code.**                                                 |
| `src/strings`       | All new copy, including every achievement name and description by code.                                                                                                                                                                                                         |
| `src/components/ui` | `DateRangePicker`, `RangeChips`, `MetricMenu`, `StatTile`, `Heatmap`, `BarChart`, `Sparkline`, `Skeleton`, `AvatarStack`, `BadgePop`, `QrImage`, `SyncDot`, `EmptyState`, `ErrorState`                                                                                          |

### 4.2 Navigation without a router

- `state.nav = { stack: Route[] }`, where `Route = { screen, params }`.
- New screens: `signin`, `invite`, `reset`, `account`, `admin`, `history`, `game`, `leaderboard`, `player`, `h2h`, `achievements`, `awards`, `season`, `wrapped`, `activity`, `players`, `live`, `recap`.
- **Browser and Android back:** a small `useHistorySync` pushes a `history` entry per stack push and pops on `popstate`, so the back gesture works. It also closes sheets first.
- **Entry links:** on boot, `?invite=`, `?reset=`, `?live=` and `?recap=` are read once, turned into the first route, and then removed with `history.replaceState`.
- `kachuful.screen` keeps persisting only `home | round | winner`; any other screen reopens at Home.

### 4.3 Service worker

- `navigateFallbackDenylist: [/^\/api\//, /^\/r\//, /^\/l\//]`.
- No runtime caching of `/api`. The app keeps its own offline copy in IndexedDB.

### 4.4 Large screen

Each new screen gets a desk version in `src/screens/desk`. The Rail (and the upright-tablet TopBar) gains **Boards, History, Players, Awards, Account**, plus **Admin** for admins. Shared logic lives in hooks, as `useRoundEdit` does today.

---

## 5. Data and migrations (saved data is sacred: new fields, new stores, nothing reshaped)

### 5.1 Schema v3 (`migrations[2]`, with characterisation tests on v0, v1 and v2 saves first)

| Field             | Rule                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Game.syncId`     | New games: `crypto.randomUUID()`. Old games: a **deterministic** UUID-shaped hash of `deviceId + id + createdAt`, so the current game, its undo snapshots and its backup all map to one remote game. `deviceId` is a new `localStorage` key, created once. |
| `Game.rev`        | Starts at 1 and increments on every committed change (undo included).                                                                                                                                                                                      |
| `Game.finishedAt` | Set when the game ends. Old finished games: `updatedAt`.                                                                                                                                                                                                   |
| `Round.doneAt`    | Set by `confirmRound` and by edits that finish a round. Old rounds: left absent (the server and the local engine fall back to `updatedAt`).                                                                                                                |
| `Player.playerId` | The registry id (local or server; §5.3). Old players get one when first archived or uploaded.                                                                                                                                                              |

### 5.2 IndexedDB `kachuful` (via `archive.ts`)

| Store     | Contents                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `games`   | Every game this device knows: finished, a copy of the active one, and ones pulled from the server. Indexed by `endedAt` and `updatedAt`. Never replaced. |
| `players` | The registry copy: local players (signed out) and server players, `{…Player, local: boolean, remoteId?}`                                                 |
| `outbox`  | Pending `putGame {syncId, rev}`, `createPlayer`, `patchPlayer`, `deleteGame`, with attempt count and next try time                                       |
| `cache`   | Last responses for boards, profiles and awards, with `fetchedAt` for "as of" labels                                                                      |
| `inbox`   | Things that need a person: an unresolved name match, a conflict copy, a game the server rejected (with its reason)                                       |

**Archive rule:** "Previous game replaced" becomes **"Previous game saved to History"**. On first run after the update, the game in `kachuful.v1` is copied into `games`.

**Storage:** request `navigator.storage.persist()` after the first finished game. When storage is full, the existing `storageFull` toast also links to History so old games can be cleaned up.

### 5.3 Players: one registry, local or synced

- **Signed out:** the "people" are local registry rows (UUID ids), matched by name key, case-insensitive. Setup chips come from them (migrated from `recentNames`). A **Merge** action fixes duplicates.
- **Signed in:** the full server registry is cached in `players` (`GET /api/players?updatedSince`). The name check works **instantly from the cache** and is confirmed by `POST` (a `409` reopens the dialog).
- **Offline but signed in:** a new name is created locally and queued. If the server answers `409 name_taken`, an inbox item asks the same-person question. **The game's upload waits** until its players are resolved.
- **Importing on sign-in:** the "Match players" screen lists each local player:
  - Auto-matched exact names are confirmed with a Yes or No.
  - Others become new players.
  - Games are rewritten to the chosen ids before upload.

---

## 6. Domain engine (TypeScript, pure, tested; also the source of the backend's golden fixtures)

- `timeline(game)` gives per round, per player: score, outcome, `doneAt` (fallback `updatedAt`), hot and cold runs, dealer flag and hook hits. Everything else builds on it.
- **Leaderboard metrics:** `avgPerRound` (**default**), points, wins, winRate, accuracy, bestRound, longestHot, games, rounds.
  - `minRoundsFor(from, to)` gives 10 for a range of a day or less, 25 up to 7 days, and 50 beyond. A player is qualified with `rounds > minRounds`.
  - Rate metrics (average, accuracy, win rate) list qualified rows ranked, then the rest unranked; count metrics rank everyone.
  - Ranking uses the exact value; ties share a rank (1, 1, 3) and are broken by points, then rounds.
  - Rank delta compares with the previous window of the same length.
  - Identical to `plan-backend.md` §6.5 and covered by the fixtures.
- **Ranges:** Today / 7 days / this month / last month / all / custom, computed in the device timezone as `[from, to)` epoch ms (the API takes the same).
- **Player stats:** everything in the contract's `PlayerStats` (`plan-backend.md` §6.3), plus calendar days, head-to-head, Wrapped and seasons.
- **Achievements:**
  - The full catalogue from `plan-backend.md` §8: codes, rules and ties exactly as written.
  - `STREAK_STEPS` becomes `[3, 5, 8, 12]`, adding a 💎 Untouchable / 🧟 Zombie tier.
  - Characterisation tests come first, as `CLAUDE.md` requires.
- **Daily awards and seasons** run on the device too, using the device timezone for the device board. The global board uses the server, whose timezone is `Asia/Kolkata`.
- **`validate(game)`** mirrors the server's `invalid_game` reasons, so a bad game is flagged before upload.
- **Fixtures export:** `EXPORT_FIXTURES=1 npx vitest run src/domain/fixtures.export.test.ts` writes `contract/fixtures/*.json`: single games with expected totals, places, timelines and achievements, plus multi-game sets with leaderboards, awards, seasons and career achievements. **This is the first hand-off to the backend** (milestone F1).

---

## 7. Sync engine

**Triggers:**

- App start, the `online` event, and the app becoming visible.
- 1.5 s after any committed change (debounced).
- Every 60 s while visible with work pending.
- Exponential backoff on failure, capped at 5 min.

**Push:**

- **Players first, then games**, both in outbox order.
- `PUT /api/games/{syncId}` sends the whole game.
- `409 stale`: compare `doneRounds` counts and keep the bigger one (on a tie, the newer `updatedAt`). The other becomes a **Conflict copy** in History with **Keep this one** and **Keep the other**. Nothing is ever dropped.
- `422 invalid_game` creates an inbox item with the reason; the game stays local.
- `422 unknown_player` re-queues the player creation.
- `remap` rewrites `playerId`s locally.
- `earned` is stored on the archived game for badges on other devices.

**Pull:**

- `GET /api/bootstrap` on sign-in and app start (one round trip, with an `ETag`), then registry updates.
- `GET /api/games?mine=1&updatedSince=` on sign-in and every 10 min, so your games follow you.
- Other people's games are fetched on demand (opened from History, a player page or the activity feed) and cached.

**Continue on this device:** an active game you scored elsewhere shows on Home as "Continue Round 7 from your other phone". It becomes the active game here, and the current one is saved to History.

**Session:**

- `state.session` is cached under a new `kachuful.session` key (user, role and player only; the cookie is the secret).
- On `401`: show "Sign in again to keep syncing"; the outbox waits.
- **Sign out:**
  - If uploads are pending: "3 games haven't synced. Sign out anyway?"
  - Then **Keep games on this phone** or **Remove them**.

**Sync UI:** a `SyncDot` in the Home header and the desk Rail: synced ✓, syncing, N waiting (offline), or needs attention. Tapping it opens Account › Sync, which has "Sync now" and the inbox.

---

## 8. Screens (phone first, desk version for each)

| Screen                     | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | States                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Home** (expanded)        | Play card (Resume / New game / Continue from other device). Today's awards strip. Your rank card (global or device, with a ▲▼ movement). Shortcuts: Boards, History, Players, Awards. Activity feed (signed in). Account chip or "Sign in".                                                                                                                                                                                                                                                                       | No games yet; offline (cached, "as of"); not signed in                                                                      |
| **Sign in**                | Email, password (show/hide), errors from the contract codes, "Forgot password? Ask Jay for a reset link."                                                                                                                                                                                                                                                                                                                                                                                                         | Busy, bad credentials, inactive, rate limited (with the wait time), offline                                                 |
| **Invite / Reset**         | Email shown. Player claim ("Is this you?" or create: display name, optional first/last name, emoji, colour). Password + confirm, with the rule hint.                                                                                                                                                                                                                                                                                                                                                              | Checking link, used or expired link, name taken, weak password                                                              |
| **Account**                | My player (edit name, emoji, colour, first/last). Change password. Sync status, inbox and "Sync now". "Upload games from this phone". Sign out. Admin entry (admins only).                                                                                                                                                                                                                                                                                                                                        |                                                                                                                             |
| **Admin**                  | **Users:** email, player, active, last seen, pending invite. **Invite** sheet (email + optional player picker) shows the link with Copy and Share. **Reset link**, **Deactivate**. **Players registry:** search, edit, merge (with a preview of games affected). **Overview:** counts and last backup.                                                                                                                                                                                                            | Empty, errors, confirm dialogs for deactivate and merge                                                                     |
| **History**                | Games grouped by day. Filters: mine / all, player, range. Badges: live, active, conflict copy, not synced.                                                                                                                                                                                                                                                                                                                                                                                                        | None yet, no results, offline (local only)                                                                                  |
| **Game view**              | Podium, final or current standings, score chart (existing `ScoreChart`), round-by-round grid (read-only `BoardBody`), achievements earned, owner actions (share recap, live link, delete).                                                                                                                                                                                                                                                                                                                        | Loading, not found / deleted                                                                                                |
| **Boards**                 | Scope tabs: **Global** and **This device**. Range chips + Custom (`DateRangePicker` sheet). Metric menu (default **Avg / round**, shown as a whole number). Rows: rank, ▲▼ delta, avatar, name, value, "12 games · 148 rounds", streak badge. **Your row is pinned** when off-screen. Below the ranked rows is a divider, **"Not ranked yet · more than 50 rounds needed"**, followed by greyed rows with a small progress bar ("32 / 51 rounds"). These stay tappable and keep text contrast at 4.5:1 or better. | Loading skeleton, empty range, nobody ranked yet (all greyed, with an explanation), global while signed out, offline cached |
| **Player page**            | Header (emoji, name, full name for signed-in viewers, linked-account tick). Range chips. Stat tiles. Points-over-time sparkline. Accuracy by cards and by trump (bars). Bid histogram. Calendar heatmap. Achievements shelf. Recent games. Top opponents → head-to-head.                                                                                                                                                                                                                                          | As Boards                                                                                                                   |
| **Head-to-head**           | Versus layout: wins either side, ties, points, last games, biggest win.                                                                                                                                                                                                                                                                                                                                                                                                                                           | Never played together                                                                                                       |
| **Achievements**           | The catalogue grid by group (round moments, game finish, career, daily, seasons). Earned items show the date and count; locked ones show how to earn them. Filter to one player.                                                                                                                                                                                                                                                                                                                                  |                                                                                                                             |
| **Awards**                 | Today's awards with ◀ ▶ day stepping ("provisional" until the day closes). **Season** tab: this month's live standings, past champions. **Wrapped** entry.                                                                                                                                                                                                                                                                                                                                                        | No games that day                                                                                                           |
| **Wrapped**                | Story slides (tap or swipe): totals, best month, best day, favourite trump, nemesis, partner, biggest round, longest run, achievements, rank. Shareable final card.                                                                                                                                                                                                                                                                                                                                               | Not enough games                                                                                                            |
| **Activity**               | Feed of achievements, finished games, new players and season closes.                                                                                                                                                                                                                                                                                                                                                                                                                                              | Empty                                                                                                                       |
| **Players**                | The registry directory, searchable, with each player's games and last played. Local merge when signed out.                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                             |
| **Share sheet** (extended) | Existing image share, plus **Recap link** (copy / share / WhatsApp) and **Live link** with a QR (`qr.svg`) and Revoke.                                                                                                                                                                                                                                                                                                                                                                                            | Offline: "Links need a connection"                                                                                          |
| **Live viewer**            | Read-only: round header, the table with bids and results, standings, last update time, "Scorer offline · 3 min" when quiet. Rows animate as rounds land.                                                                                                                                                                                                                                                                                                                                                          | Connecting, revoked, not found, offline                                                                                     |
| **Recap viewer**           | Podium, highlights, chart, rounds, achievements, and an "Open Kachuful" call to action.                                                                                                                                                                                                                                                                                                                                                                                                                           | Revoked, not found                                                                                                          |
| **Setup changes**          | Registry chips with emoji. The same-person card (§5.3). "Count online" note when signed in.                                                                                                                                                                                                                                                                                                                                                                                                                       |                                                                                                                             |

---

## 9. Achievements and celebrations during play

- **Full-screen burst** (today's `StreakCelebration`, generalised to `AchievementCelebration`) for:
  - `hot_*`, `cold_*`, `grand_slam` and `perfect_game`
  - `comeback`, `hat_trick` and `dynasty`
  - On open: `season_champion` (with confetti)
- Bursts queue at most **2 per round**; the rest fold into a "+3 more" badge pop.
- **Badge pop** (a compact card dropping in under the top bar for 2.5 s, stacking) for the other round moments and for milestones ("Riya's 100th game!").
- **Winner screen reel:** the achievements this game earned, as cards flipping in one by one; tap one for details.
- **Summary rows** show newly earned badges next to the existing streak badge.
- **Signed in:** server `earned` rows that this device didn't celebrate (e.g. career milestones counted from other devices' games) appear in the activity feed and the badge shelf, never as surprise full-screen moments.

---

## 10. Animations catalogue (transform/opacity only; each has a reduced-motion version)

| Moment                 | Motion                                                                                     | Reduced motion    |
| ---------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| Achievement burst      | Rays rotate, shockwave rings, particles, emoji pop, flash for big tiers (existing pattern) | Fade only         |
| Badge pop              | Spring drop from the top, slight tilt settle, auto-dismiss                                 | Fade              |
| Winner reel            | Cards flip in (`rotateY`) with a stagger                                                   | Fade with stagger |
| Leaderboard reorder    | FLIP `layout` moves; ▲▼ deltas slide in; your pinned row lifts                             | Instant           |
| Rank change on Home    | Number count-up (existing `Counter`) and an arrow nudge                                    | Static            |
| Range or metric change | Rows cross-fade with a 20 ms stagger                                                       | Fade              |
| Charts                 | Line revealed by a `scaleX` clip mask; bars grow with `scaleY`                             | Static            |
| Heatmap                | Cells fade in diagonally                                                                   | Static            |
| Head-to-head           | Avatars slide in from both sides and "clash" (scale pulse)                                 | Static            |
| Season podium          | Steps rise (`scaleY`, origin bottom); champion confetti                                    | No confetti       |
| Wrapped                | Slide transitions, big-number count-ups, emoji float                                       | Cut + fade        |
| Live viewer update     | Changed rows pulse (opacity), new round slides in                                          | Fade              |
| Same-person card       | Card flips from the input to the player card                                               | Fade              |
| Sync dot               | Gentle rotate while syncing; check pops in                                                 | Static icon swap  |
| Skeletons              | Shimmer as a translated gradient overlay                                                   | Static            |
| QR reveal              | Scale-in from 0.9                                                                          | Fade              |

---

## 11. Working without the backend: a mock API

- A **dev-only Vite plugin** (`tools/mock-api/`, `configureServer` + `configurePreviewServer`) implements the whole contract in memory with seeded data. It is enabled by `npm run dev:mock` and by the e2e web server.
- No dependency: it is plain Node handlers.
- It mirrors the contract's status codes and error bodies.

This lets the frontend be built and tested end to end before the backend exists; staging replaces it at F9.

---

## 12. Testing

- **Domain:** characterisation tests before touching streak tiers or migrations. Unit tests for every metric, range edge (DST is n/a for India but tested with a fixed zone), achievement rule and tie case. The fixtures export is checked into `contract/fixtures`.
- **State/sync:** reducer tests for the nav stack, session and outbox. Sync engine tests with a fake `fetch`: stale conflict → conflict copy, `401` pause, backoff, remap, provisional players.
- **Components:** screens render every state (Testing Library). Accessibility tests run on the new sheets and dialogs.
- **e2e (Playwright, phone + desktop projects, mock API):**
  - The full journeys in §3.
  - An **offline → online** spec: play a full game with the network off, reconnect, and check it is uploaded and counted.
  - The axe scan extended to every new screen at phone and desktop sizes.
  - The touch-target spec covers new controls.
- **Staging smoke:** one spec signs in against staging, uploads a game and reads it back on the board.

---

## 13. Build order (each step is a set of Conventional Commits, one concern each; all checks green at every step)

1. **F0 Foundations:** schema v3 migration (characterisation tests first); `archive.ts`; finished games kept; History + Game view (phone + desk); nav stack + back button; service worker denylist.
2. **F1 Engine:** timeline, stats, leaderboards, ranges, head-to-head, achievements catalogue (+ the 12-run tier), awards, seasons, Wrapped, `validate`; all strings. **Fixtures export → hand to the backend.**
3. **F2 Local experience:** local player registry, chips, merge; device Boards + DateRangePicker; Player page, head-to-head, Achievements, Awards (device); live celebrations generalised; Winner reel; Home hub.
4. **F3 API layer:** `api.ts`, error mapping, mock-api plugin, session slice, SyncDot.
5. **F4 Accounts:** Sign in, Invite accept with player claim, Reset, Account, change password, Admin (users, invites, reset links, deactivate, players registry, merge).
6. **F5 Registry sync:** cache, instant name check, same-person card, offline provisional players, inbox.
7. **F6 Game sync:** outbox, push/pull, conflict copies, first-sign-in import + Match players, continue on another device, sign-out flows.
8. **F7 Global:** global Boards, server player pages, calendar, head-to-head, achievements from the server, daily awards, seasons, activity, Wrapped.
9. **F8 Sharing:** share sheet links + QR, Live viewer (SSE), Recap viewer, entry links.
10. **F9 Finish:** **verify against the backend's `HANDOFF.md`** (status table, curl checks, staging accounts; the e2e suite runs against staging with `E2E_API=staging`; report every mismatch), animation and reduced-motion pass, axe and touch-target audits, Lighthouse, staging smoke, `docs/codebase/ARCHITECTURE.md` + `DESIGN-SYSTEM.md` updates, manual test checklist in `docs/MANUAL-TEST.md`.

## 14. Unverified until real devices and the real backend exist

- Keyboard and IME behaviour on real phones.
- iOS PWA storage eviction and `storage.persist()`.
- SSE through the production nginx.
- WhatsApp link previews (they need the backend's `/r/` pages live).

Each of these is called out in the final report rather than assumed.

## 15. Performance (instant by default)

- **Cache first, refresh second.** Every screen renders immediately from IndexedDB (`cache` and `games`), then revalidates. Requests send `If-None-Match`, so a `304` costs almost nothing. The UI marks stale data only when offline ("as of 9:40").
- **One bootstrap call** fills the app after sign-in. Boards, player pages and awards are prefetched once Home is idle (`requestIdleCallback`), and a player page is prefetched when its row is pressed.
- **Optimistic writes:** confirming a round, editing a player or creating a link updates the screen at once. The outbox does the network work and rolls back only on a hard error, with a toast.
- **Cancel what's stale:** `AbortController` on range and metric changes, and filters debounced by 150 ms.
- **The local engine is memoised** by archive version. Above 300 archived games, the device board runs in a Web Worker (Vite supports workers natively; no dependency).
- **Long lists** (History, Activity, registry) get a small hand-written windowing hook past 100 rows.
- **No skeleton flash:** skeletons appear only if data takes more than 150 ms. Images (QR, OG) get fixed sizes, so nothing jumps.
- **Bundle:** new screens are lazy chunks, as the desk UI is today, so the phone's first load grows by no more than 15 kB gzip. Lighthouse performance stays at or above today's score; `tools/trace.mjs` shows no long tasks over 50 ms on Boards at 4× CPU throttle.
