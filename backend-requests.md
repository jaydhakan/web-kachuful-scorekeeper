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

| kind            | amount                    | when                                                                                                  | key (unique per player)      |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `finish`        | 30 (+10 Ishaara, online Spades) | seated in a finished, non-void game of 2+ players                                               | `finish:<gameId>`            |
| `win`           | 25                        | place 1 in that game (ties and a winning team: each of them)                                          | `win:<gameId>`               |
| `achievement`   | per fixture               | each `achievements` row (moment, game, career, daily, season), 0-amount codes write no entry         | `ach:<achievementId>`        |
| `kursi_take`    | 30                        | Kachuful: took the Kursi in that game (`domain/kursi.py` reigns)                                      | `kursi:<gameId>`             |
| `kursi_defence` | 10                        | Kachuful: held it at that game as holder (each defence)                                               | `kursi:<gameId>`             |
| `streak`        | 10 × weeks in a row, ≤ 50 | the player's first finished game (any kind) of an ISO week in APP_TZ; weeks in a row counts this one  | `streak:<YYYY-Www>`          |

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

## 6. Crowns and status changes (plan §6, G2's server half) — NOT BUILT YET

**Why:** the medals, the Kursi and the Sitara are computed on read today, so a crown change has no feed item, no "held
N days", and only the table device sees the takeover. Every phone at the table (and the feed) should hear "Kursi
chheeni!" from the server, and a holder's reign should be a record.

**Table** `crowns(game text, kind text check in ('medal1','medal2','medal3','kursi','sitara','legend'), holders uuid[],
since timestamptz, since_game uuid null, defences int default 0, primary key (game, kind))` and
`crown_reigns(id, game, kind, holders uuid[], since, until, since_game, until_game, defences)`. Rewritten in
`progress_game` (and Kachuful's store path) when a game ends, is voided or deleted: recompute that game's kinds from
the same rules as `GET /api/medals` / `GET /api/kursi` (`app/domain/kursi.py`), diff with the stored row, and write a
reign and an `activity` row (`kind 'crown'`, `data: {crown, from: [ids], to: [ids], defences}`) on a change. A
recompute that changes nothing writes nothing. Kachuful only at first; `game` keeps it open for the others.

**Upload response:** the Kachuful PUT response (and each other kind's write response, once it has crowns) gains
`status: { changes: [{ kind, from: PlayerSummary[], to: PlayerSummary[], defences }] }` for that write's changes only;
an empty list when nothing moved. The user stream (`/api/me/events`) sends the same as `{type: 'status', game,
gameId, changes}` to every account seated in the game.

**Reads:** `GET /api/crowns?game=` → `{ items: [{ kind, holders: PlayerSummary[], since, sinceGame, defences }] }`;
`GET /api/crowns/reigns?game=&kind=&cursor=` → paged reigns, longest first when `sort=defences`.

## 7. Nights (plan §7.2) — NOT BUILT YET

**Why:** Tonight's Wrapped exists on the table device only (`games/kachuful/domain/night.ts`). Everyone who sat should
get it on their own phone, and the feed should say a night is ready.

**Rule:** a night is a run of finished games (any kind) with gaps of 3 hours or less between one game's end and the
next one's start, grouped across the players who sat; the app's `nightOf` is the reference (a golden fixture
`night-cases.json` to export first).

**Table** `nights(id uuid, started_at, ended_at, players uuid[], games uuid[], data jsonb, closed_at)`. Job
`close-nights` (every 30 min, beside `close-day`): closes a night whose last game ended 3+ hours ago, stores the
story facts in `data` (the same shape the app's `NightPage` builds), writes an `activity` row (`kind 'night'`) and
pays tonight's Sitara 30 Sikke (`sikke` kind `sitara`, key `sitara:<nightId>`).

**Reads:** `GET /api/nights?playerId=&cursor=` (newest first) and `GET /api/nights/{id}`; an open night is
`{ closed: false }` so the app says "Your night is being counted…".
