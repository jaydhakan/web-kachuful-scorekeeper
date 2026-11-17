# Backend requests: achievements and awards for every game

For the app's `feat/achievements-every-game` (plan: `docs/ACHIEVEMENTS-PLAN.md`, approved by Jay 2026-11-17). Build
in `../backend-kachuful-scorekeeper` on the branch of the same name. Every change is additive: the current app (which
sends no `game`) must keep working unchanged, and Kachuful's rules, codes, rows and responses don't change.

`game` is one of `kachuful`, `spades`, `kaali-teeri`, `ishaara`. Both Spades kinds (`spades`, `spades-online`) are
the game `spades`: one catalogue, one board.

## 1. Migration 0022: rows know their game

- `achievements.game TEXT NOT NULL DEFAULT 'kachuful'` with a CHECK on the four values. The unique key becomes
  `(game, player_id, code, game_id, round_index, period)` (nulls not distinct, as today). The per-player paging
  index becomes `(player_id, game, earned_at DESC, id DESC)`.
- `activity.game TEXT NOT NULL DEFAULT 'kachuful'` with the same CHECK and an index on
  `(game, created_at DESC, id DESC)`.
- `closed_periods.game TEXT NOT NULL DEFAULT 'kachuful'`; the primary key becomes `(game, period)`.
- Existing rows are Kachuful's (the default backfills them). Downgrade: delete rows whose `game` isn't `kachuful`, then
  restore the old keys and drop the columns.

**Why:** codes such as `winner` and `games_10` exist in every game, and career and period rows have no game row to
tell them apart. A day or month must close once per game.

## 2. The engine runs any game's rules

`AchievementsEngine` keeps today's behaviour (insert wanted keys, delete keys that no longer hold, never touch a kept
row, so `earned_at` and `data` survive). It takes a per-game rules module:
`app/domain/<game>/achievements.py` and `awards.py`, mirroring the app's `src/games/<game>/domain/achievements.ts` and
`awards.ts`, with parity proven by golden fixtures (`contract/fixtures/<game>-achievements-*.json`,
`<game>-awards-*.json`). Kachuful's module is today's code; its `PUT /api/games/{id}` stays within its 120 ms budget.

**Recompute points** (each recomputes the game's own rows, then the careers of its players, in that game only):

| Game               | When                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Spades scorekeeper | `SpadesGamesService.store` (upload, reseat) and `delete`                                  |
| Spades online      | after every hand ends (hand moments), `finish_derived`, `end_idle`, `delete`              |
| Kaali Teeri        | `KtGamesService.store` (upload, reseat) and `delete`                                      |
| Ishaara            | `IshaaraGamesService.finish_derived`, `end_idle`, `delete` (abandoned games earn nothing) |
| Merge              | `MergeService.merge`: careers for the target player in every game                         |

Achievement activity rows carry the game. A finished game of any kind writes `game_finished` activity, as Kachuful's
does.

## 3. API

1. **`?game=`** (default `kachuful`) on:
   - `GET /api/achievements?game=&playerId=&cursor=&limit=`
   - `GET /api/activity?game=&cursor=&limit=`: also accepts `game=all` (every game, for Me)
   - `GET /api/awards/daily?game=&date=`
   - `GET /api/seasons?game=`
   - `GET /api/seasons/{YYYY-MM}?game=`
2. **`AchievementOut` and `ActivityItemOut` gain `game: str`.** `ActivityItemOut.game` keeps its name for the game
   summary, so the new field is **`gameKind`** on the wire (`game_kind` in Python) on both, to avoid the clash.
   `ActivityItemOut.game` (the summary) resolves games of every kind, not only Kachuful.
3. **Seasons of the other games** have win-rate standings, not Kachuful's points rows. For `game != kachuful`,
   `GET /api/seasons/{month}` returns `GameSeasonOut`:
   `{ season, final, gameKind, minGames, standings: [{ rank|null, qualified, player, value (win rate 0–1), games, wins }], awards: AwardOut[] }`.
   Kachuful keeps `SeasonOut` exactly. Minimum games per month: Spades 10, Kaali Teeri 8, Ishaara 8 (a player
   qualifies with at least that many).
4. **New `GET /api/achievements/ladders?game=&playerId=`** → `{ gameKind, playerId, counts: { [ladderId]: int } }`:
   each ladder's count, counted the way its codes are earned (Kachuful's: `hot, cold, wins, games, rounds, made,
points, crew`; the others' ids are in each game's rules module).
5. **Uploads return what they earned:** the Kaali Teeri and Spades scorekeeper upload responses fill `earned` (today
   always `[]`) with the rows the upload added, like Kachuful's.

## 4. Jobs

- `close-day [--date] [--since YYYY-MM-DD] [--game]`: closes every game for the day by default, so the systemd timer
  doesn't change. `--since` closes every unclosed day from that date to yesterday (backfill). Idempotent.
- `close-season [--month] [--since YYYY-MM] [--game]`: the same for months; writes `season_closed` activity per game.
- New `recompute-achievements --game <game>`: walks every stored game of that game once, then every player's career.
  Idempotent (kept rows keep `earned_at`).

## 5. Catalogues

Exactly the codes, rules and thresholds in `docs/ACHIEVEMENTS-PLAN.md` §3 (Spades), §4 (Kaali Teeri), §5 (Ishaara).
The app's TypeScript is the reference; the fixtures decide any doubt.
