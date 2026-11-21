# Backend requests: Rewards (REWARDS-PLAN.md)

Working doc for the rewards build (branch `feat/rewards` in both repos). Delete once both sides are built, tested and
committed.

## 1. Kachuful medals: the month's standings without the game in progress

**Why:** Kachuful's medals (🥇 Badshah, 🥈 Wazir, 🥉 Senapati, plan §6.7) are the top three of this month's season
standings (points per round, more than 50 rounds). At the table the app shows the medals **as they stood before this
game**, and projects "if the game ended now" by adding this game's rounds itself. The live season already counts the
game's synced rounds, so the app needs the standings with that game left out.

**Route:** `GET /api/medals?excludeGame=<uuid>` (signed in; `excludeGame` optional; Kachuful only).

**Response** `MedalsOut`:

```json
{
  "season": "2026-11",
  "minRounds": 50,
  "standings": [
    LeaderboardRow
  ],
  "lastSeason": [
    LeaderboardRow
  ]
}
```

- `season` is the current month in `APP_TZ`.
- `standings`: every player on this month's board, ranked as `GET /api/seasons/{month}` ranks, after subtracting the
  excluded game's rounds and points (`round_scores` where `game_id = excludeGame`) inside the month. A player left with
  no rounds is dropped.
- `lastSeason`: last month's qualified rows with rank 1–3 (the closed season's when closed; else live).
- An unknown or other-kind `excludeGame` excludes nothing (no error): the app may ask before its first upload.
- No ETag needed: the app asks once when a game opens.

**Built:** backend `feat/rewards` 2cc9cd9 (`tests/api/test_medals.py`); app `ep.medals`, `state/medals.tsx`.

## 2. The Kursi (Kachuful first)

**Why:** the Kursi (plan §6.3) is a chair you take by finishing above its holder. The app shows who holds it at the
deal, teases them in the banter and plays "Kursi chheeni!" when it changes hands. It needs the chair **before** the
game at the table; the app applies that game itself with the same rule.

**Rule:** `src/progression/kursi.ts`, mirrored in `app/domain/kursi.py`; parity is `contract/fixtures/kursi-cases.json`.
Games count with 3+ seats, oldest first (ties by id); a game with no place (unfinished) never counts.

**Route:** `GET /api/kursi?excludeGame=<uuid>` → `{ kursi: { holders: PlayerSummary[], since, sinceGame, defences } |
null, longest: { …, until } | null }`, computed on read from `game_players` (ended Kachuful games, not deleted).

**Built:** backend 25ef480 (`tests/domain/test_kursi_golden.py`, `tests/api/test_medals.py`).
**Later:** the other games, a `kursi` table written in `progress_game` once reads get slow, and `status.changes`.

## 3. Aaj ka Sitara: tonight without the game at the table

**Why:** the Sitara (plan §6.1) is tonight's points leader, from the night's second game on, at a table of 3+. The app
projects it during the game, so it needs today's points without the game in progress.

**Change:** `GET /api/medals` gains `today: { day, games, rows: [{ player, points, rounds }] }` (APP_TZ day; `games`
counts Kachuful games with a round done today, `excludeGame` left out; rows sorted by points).

**Built:** backend (feat/rewards, after 25ef480).

## 4. Places for the table intel line

**Why:** round 1's deal names a rivalry ("Dev has beaten Asha 7 of their last 9") or a milestone ("Riya's 100th game")
(plan §6.5). The app finds them in finished games' places with `src/progression/intel.ts`; signed in it needs those
places from the server.

**Route:** `GET /api/places?excludeGame=&limit=500` → `{ games: [{ gameId, endedAt, seats: [{ playerId, place, seat }] }] }`,
ended Kachuful games, newest first.

**Built:** backend 30b1e27 + fix.

## 5. Sikke: the ledger, the earn rules, levels (plan §9, phase G3)

**Why:** Sikke are the app's coins: earned by playing, spent later in the Bazaar (G5). The server decides every entry,
in the same transaction as the game write, so every phone agrees and nothing can be typed in. The app shows a wallet
chip and a ledger, and "+🪙" per player on the winner screen.

**Rules:** the app's `src/progression/sikke.ts`; parity is `contract/fixtures/sikke-rules.json` (`rates`, `levels`, and
`achievements[game][code]` = what each code pays, already worked out: shame codes and Kachuful's `cold_*` ladder pay 0,
a ladder level N pays 25×N, `season_champion` 300, other season codes 100, daily 15, else moment 5 / game 10 / career
25, doubled when big). The backend reads the amounts per code from its own copy of that fixture's numbers (a module
`app/domain/sikke.py` with the table, checked equal to the fixture by a test), never by re-deriving `big`.

**Entries** (a player is a registry player, so a player with no account accrues and their claim brings it along):

| kind            | amount                          | when                                                                                                 | key (unique per player) |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| `finish`        | 30 (+10 Ishaara, online Spades) | seated in a finished, non-void game of 2+ players                                                    | `finish:<gameId>`       |
| `win`           | 25                              | place 1 in that game (ties and a winning team: each of them)                                         | `win:<gameId>`          |
| `achievement`   | per fixture                     | each `achievements` row (moment, game, career, daily, season), 0-amount codes write no entry         | `ach:<achievementId>`   |
| `kursi_take`    | 30                              | Kachuful: took the Kursi in that game (`domain/kursi.py` reigns)                                     | `kursi:<gameId>`        |
| `kursi_defence` | 10                              | Kachuful: held it at that game as holder (each defence)                                              | `kursi:<gameId>`        |
| `streak`        | 10 × weeks in a row, ≤ 50       | the player's first finished game (any kind) of an ISO week in APP_TZ; weeks in a row counts this one | `streak:<YYYY-Www>`     |

- **Daily cap:** `finish` and `win` pay for a player's first 8 finished games of one progression game per APP_TZ day
  (by `ended_at`, then id); later games that day write no `finish` or `win` entry. Achievements always pay.
- **Recompute-safe:** a reconcile like `AchievementsEngine`: compute what a player should hold now, insert new keys,
  update `amount`/`data` where changed, delete keys that no longer hold, never touch `earned_at` of a kept row.
  `earned_at` is the source's time (the game's `ended_at`, the achievement's `earned_at`).
- **Hooks:** after `progress_game` (every kind) and after Kachuful's store path, for the game's players; after
  `close-day` / `close-season` for the awarded players; after a merge or claim, for the kept player; when a Kachuful
  game ends, is voided or deleted, recompute the Kursi entries of everyone in its chain. A deleted or abandoned game
  earns nothing (its entries go).
- **Backfill:** CLI `recompute-sikke [--dry-run]`: every player, idempotent. `--dry-run` prints each player's lifetime
  total and level, and the weekly average over their active weeks, so the prices and levels can be checked against
  real history (plan §9). Run once at deploy.

**Table** `sikke_entries(id uuid pk, player_id fk players, key text, kind text check, amount int > 0, game text null
(the progression game), game_id uuid null fk games on delete cascade, achievement_id uuid null fk achievements on
delete cascade, earned_at timestamptz, data jsonb default '{}')`, unique `(player_id, key)`, index
`(player_id, earned_at desc, id desc)`. Spends (G5) will be a separate table; the balance is earned − spent.

**Levels:** lifetime = sum of entries; `levels` in the fixture (`from` 0, 500, 1500, 4000, 9000, 18000; n 1–6). The
app owns the names.

**Routes** (signed in; any registry player, as the boards are):

- `GET /api/players/{id}/sikke` → `SikkeOut { playerId, balance, lifetime, level: { n, from, next: int | null } }`
  (a player with no entries: zeros, level 1). Unknown player: 404 `not_found`. Merged-away id: follow the alias.
- `GET /api/players/{id}/sikke/entries?cursor=&limit=` → `{ items: SikkeEntryOut[], nextCursor }`, newest first;
  `SikkeEntryOut { id, kind, amount, game: str | null, gameId: str | null, code: str | null, period: str | null,
earnedAt }` (`code`/`period` from the achievement row for `achievement` entries).
- `GET /api/games/{id}/sikke` → `{ items: [{ playerId, amount, entries: [{ kind, amount, code }], level: { n, from,
next }, levelUp: { from: int, to: int } | null }] }`: what that game paid each of its players (the entries whose
  `game_id` is the game, including its achievements' entries, plus the `streak` entry if this game was the week's
  first), seat order. `levelUp` when the player's lifetime without this game's amount was a lower level. An unfinished
  game: `items` with zero amounts (not an error). Any kind.

**Not now:** bounties (40) and tonight's Sitara (30) pay once G2's server half lands (`crowns`, `nights`); the
"Pehle Waale" badge is a Wardrobe item (G4).

**Built:** backend feat/rewards 47f1b40…43ea857 (`tests/{domain,services,api}/test_sikke.py`); app `ep.sikke*`,
`components/sikke`. Deviations: an unfinished game lists achievements already earned; the Kursi chain is rebuilt on
any write to an ended Kachuful game.

## 6. Crowns, status changes and bounties (plan §6, G2's server half)

**Why:** the medals, the Kursi and the Sitara are computed on read today, so a crown change has no feed item, no "held
N days", and only the table device sees the takeover. Every phone at the table (and the feed) should hear "Kursi
chheeni!" from the server, a holder's reign should be a record, and beating a holder should pay a bounty.

**Kinds (Kachuful only at first; `game` keeps it open):** `medal1` (the Taj / Badshah), `medal2`, `medal3` (the
current month's standings as `GET /api/medals` ranks them, qualified rows only), `kursi` (`app/domain/kursi.py`),
`sitara` (today's leader as `GET /api/medals` `today` computes it: `sitaraOf` in `src/games/kachuful/domain/stars.ts`,
2+ games, ties share, nobody at 0 or less), `legend` (most `season_champion` rows, at least 2, ties share).

**Tables:** `crowns(game text, kind text check (…the six kinds), holders uuid[] (sorted), since timestamptz, since_game
uuid null, defences int default 0, primary key (game, kind))` and `crown_reigns(id uuid, game, kind, holders uuid[],
since, until, since_game uuid null, until_game uuid null, defences)`, index `(game, kind, until desc)`.

**Recompute:** in the same transaction as Kachuful's store path when a game ends, is voided, deleted or edited after
its end, and after `close-day` / `close-season` / a merge: recompute every kind from the rules above, diff with the
stored row, and on a change close a reign (`until`, `until_game`) and write the new row, plus an `activity` row (`kind
'crown'`, `data: {crown, from: [ids], to: [ids], defences}`). A recompute that changes nothing writes nothing. Holders
empty is a valid row (nobody holds it: e.g. the Sitara after midnight, cleared by `close-day`, no activity row for a
clear). `kursi` defences come from the domain chain; the other kinds keep 0.

**Bounties** (Sikke kind `bounty`, 40 = `rates.bounty` in `sikke-rules.json`): in a finished Kachuful game with 3+
seats, each player who finished strictly above a **holder** (whoever held `kursi` or `medal1` when the game started:
the Kursi from the domain chain before that game, the Taj from the `medal1` reign covering the game's `created_at`)
earns 40, once per challenger per holder per ISO week (APP_TZ): key `bounty:<holderId>:<YYYY-Www>` (unique per
player, so the first game that week wins it). `earned_at` = the game's `ended_at`; `game_id` = the game. Recompute-safe
like the rest of `services/sikke.py` (a voided game's bounty goes; the next qualifying game that week then earns it).

**Upload response:** the Kachuful PUT response gains `status: { changes: [{ kind, from: PlayerSummary[], to:
PlayerSummary[], defences }], bounties: [{ holder: PlayerSummary, winner: PlayerSummary, amount }] }` for that write's
changes only; empty lists when nothing moved (always present on a Kachuful PUT). The user stream (`/api/me/events`)
sends `{type: 'status', game, gameId, changes, bounties}` to every account seated in the game (when either list is
non-empty).

**Reads (signed in):** `GET /api/crowns?game=kachuful` → `{ items: [{ kind, holders: PlayerSummary[], since,
sinceGame, defences }] }` (all six kinds, holders empty when nobody); `GET /api/crowns/reigns?game=&kind=&cursor=&sort=
recent|defences` → `{ items: [{ kind, holders, since, until, defences }], nextCursor }` (closed reigns; `sort=defences`
longest first).

**Backfill:** CLI `recompute-crowns [--dry-run]` rebuilds `crowns` and `crown_reigns` from history (reigns of the Kursi
from its chain; medals, Sitara and Legend from now on only, since their past standings aren't kept), without writing
activity rows. Then `recompute-sikke` for the bounties.

**Built:** backend feat/rewards c39906b, 04a80dc (migration 0024); app `src/sync/news.ts`, `components/crowns`, feed
rows, round 1's bounty line. Choices: see `docs/NEXT-SESSION-REWARDS.md` "Backend choices to know".

## 7. Nights (plan §7.2)

**Why:** Tonight's Wrapped exists on the table device only (`games/kachuful/domain/night.ts`). Everyone who sat should
get it on their own phone, the feed should say a night is ready, and tonight's Sitara is paid.

**Rule:** games (any kind, finished, not void, not deleted) are linked when they share a registry player and the later
one's `created_at` is at most 3 hours after the earlier one's `ended_at`; a night is a connected group of linked games
(on one table device this is exactly the app's `nightOf`). The night's **story** (`data`) is the app's `Night` shape
(`src/games/kachuful/domain/night.ts`) computed over the night's Kachuful games with `nightOf`'s rules (edge, swing,
best bid, brave call at 3+ seats, Kursi taken tonight from the chain before the night's first game), parity with
`contract/fixtures/night-cases.json` (`cases.*.games` are Kachuful payloads, `now`, and the expected `night` or null;
`gapMs`, `freshMs`; compare `edge` with a 1e-9 tolerance). For the other kinds a seat counts in `players[].games`, a
place 1 counts in `players[].wins` and `gameWinners`, nothing else. `data` adds `gameKinds: string[]` (parallel to
`gameIds`), `sitara: [ids]` (`sitaraOf` over the night's Kachuful games of 3+ seats, points summed), `sikke: {playerId:
amount}` (the entries of the night's games plus its Sitara pay), `achievements: [{ playerId, game, code }]` (earned in
the night's games).

**Table** `nights(id uuid pk, started_at, ended_at, players uuid[], games uuid[], data jsonb, closed_at timestamptz
null)`, GIN index on `players`. `id` is deterministic: uuid5 of the earliest game's id, so a recompute keeps it.

**Job** `close-nights` (every 30 min, beside `close-day`; and the CLI): a night whose last game ended 3+ hours ago is
closed: store `data`, write an `activity` row (`kind 'night'`, `data: {nightId, games, winner}`), pay the Sitara
(`sikke` kind `sitara`, 30 = `rates.sitara`, key `sitara:<nightId>`, `earned_at` = `ended_at`), and send `{type:
'night', id}` on the user stream to the accounts that sat. A write to a game of a closed night (or a new game that
joins one) recomputes that night (same id while its earliest game stands) and its Sitara pay, with no second activity
row. Idempotent.

**Close now:** `POST /api/nights/close` (signed in) closes the caller's own open night at once (the "End the night"
button), same as the job; 404 `not_found` when they have no open night.

**Reads (signed in):** `GET /api/nights?playerId=&cursor=` → `{ items: [{ id, closed, startedAt, endedAt, players:
PlayerSummary[], games: int, winner: PlayerSummary | null }], nextCursor }` newest first; the player's open night (not
yet closed, computed on read) comes first with `closed: false` and `id` null. `GET /api/nights/{id}` → `{ id, closed,
startedAt, endedAt, players: PlayerSummary[], data }` (`data` null while open; the app says "Your night is being
counted…").

**Backfill:** CLI `close-nights [--all]` closes every past night (no activity rows, no stream events with `--all`),
then `recompute-sikke` pays past Sitaras.

**Built:** backend feat/rewards 7f18fab (migration 0025); app `NightPage` with an id, `YourNights`, `NightReady`. The
night feed item's `data.games` is the list of game ids; `POST /api/nights/close` returns the night's detail.

## 8. The Kachuful PUT within its budget again (no API change)

**Why:** `make perf` on the load set (5,000 games, 50 players) measured the PUT's p95 at 438 ms against its 120 ms
budget. Every write that earned an achievement rebuilt each seated player's whole Sikke ledger (every finished game,
every achievement, ~12,000 entries for five players), and a game's end also replays the whole Kursi chain.

**Change (behaviour identical, responses unchanged):**

- A game write pays only its newly inserted achievement rows: the engine never touches a kept row and a deleted one's
  entry cascades. Finishes, wins and streaks replay a player's finished games only when a game ended, un-ended or went.
  The other callers (merges, awards, the other games, `recompute-sikke`) keep the full per-player rebuild.
- A delete pays the career rows it moves onto a later game (`games_10`, a streak), as the full rebuild did; deleting an
  unfinished game that moves a milestone now pays it too (it never did).
- The reconcile reads the nine columns it compares, not ORM entities.
- Proof: a service test drives one game through running writes, its end, an edit after the end and its deletion, and
  after each write the ledger equals a full rebuild.

**Measured on the load set:** a running game's PUT ~130 → ~21 ms; a game-ending PUT ~310 → ~195 ms; `make perf`'s p95
(finished games only) 438 → 254 ms, still over 120: left for now (Jay, 2026-11-21), noted in `docs/codebase/TODO.md`. What remains in the
ending PUT is the whole-chain work (Kursi chain read ~45 ms, Kursi/bounty Sikke ~30 ms, nights ~30 ms, crowns ~17 ms),
which grows with the number of ended games.
