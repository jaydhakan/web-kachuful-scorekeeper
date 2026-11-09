# Backend requests

Working doc for the Baithak platform + Kaali Teeri build (2026-11-09). Never commit; delete when the feature is done in
both repos. Full context: `docs/PLATFORM-PLAN.md` §8 and `docs/KAALI-TEERI-PLAN.md` §7.

## 1. Games have a kind (platform P8)

**Why:** the site hosts more than one game. Every game row must say which game it is, and an old Kachuful client must
never receive a payload it can't parse.

1. Migration: `games.kind text not null default 'kachuful'`, check `kind in ('kachuful','kaali-teeri','ishaara')`,
   index `(kind, updated_at)`. No data migration (every row today is Kachuful). Working `downgrade()`.
2. Every existing endpoint reads and writes only `kind = 'kachuful'`: `GET /api/games`, `GET/PUT/DELETE
   /api/games/{id}`, bootstrap's games, boards, player stats/games/calendar, h2h, achievements, awards, seasons,
   Wrapped, claims, share links, public live/recap, jobs (auto-end, prune-empty, close-day/season). `PUT
   /api/games/{id}` on an id that exists with another kind → `409 kind_mismatch` (never overwrite another game's row).
3. Tests: a non-Kachuful row (inserted directly) never appears in any Kachuful response and isn't touched by Kachuful
   jobs; today's behaviour is unchanged (existing suite green).

## 2. Player-wide code counts every game (platform §8 item 5)

**Why:** players are one registry for every game (Rahil in Kachuful is the same Rahil in Kaali Teeri).

Make these game-agnostic, so adding a game means adding its seat table to one list:
- `players_repository.delete_unused_created_by`: a player is "used" if seated in any game of any kind.
- `players.games_count` / `last_played_at` refresh: count every kind.
- `games_repository.ids_with_player` + admin merge: rewrite seats in every kind's payload and derived tables.
- `empty_ids` (`round_count == 0`): every kind sets `round_count`.

Kaali Teeri's tables (§3) join these lists when they're added. Test per item.

## 3. Kaali Teeri

**Why:** the second game. Same model as Kachuful: one phone scores a real-deck game; signed in, the game uploads and
feeds boards and player stats. Rules: `docs/KAALI-TEERI-PLAN.md` §2 (final). The TypeScript domain in
`src/games/kaali-teeri/domain/` is the source of truth; the Python mirror must agree with it on every golden fixture.

### 3.1 Storage
- `games` row with `kind = 'kaali-teeri'`, `payload` = the `KtGame` JSON as uploaded, `summary` from `summary(game)`
  (`stats.ts`), `round_count` = number of done hands.
- `kt_hands` (derived on upload, same transaction, replaced wholesale): the shape of `handRows(game)` in
  `stats.ts` (game_id, hand_index, dealer_id, bidder_id, bid, forced, trump, partner_ids uuid[], slots jsonb,
  team_points, made, sweep `none|bidders|defenders`, done_at).
- `kt_game_players`: the shape of `gamePlayerRows(game)` (points, place, won, hands_bid, bids_made, times_partner,
  partner_made, double_slots, sweeps).
- `kt_player_day` (player_id, day in APP_TZ, games, wins, points, hands_bid, bids_made, partner_hands, partner_made),
  maintained like Kachuful's `player_day`. Boards read only this and `kt_game_players`, never `payload`.
- Register `kt_game_players` in the player-wide list from §2 (unused delete, counters, merge rewrites seats in
  `payload.players[].playerId` and the derived tables, empty games).
- Indexes for every list and board query, with `EXPLAIN` tests like Kachuful's.

### 3.2 Routes (Kachuful's unchanged)
| Route | Purpose |
|---|---|
| `PUT /api/kaali-teeri/games/{id}` | Upload, Kachuful's semantics exactly: owner/admin, `rev`, `409 stale` with `server`, `410 gone`, `422 unknown_player`, `remap`, `409 kind_mismatch` if the id is another kind's |
| `GET /api/kaali-teeri/games` | List: `updatedSince`, `cursor`, `mine`, `involving`, `status`; tombstones |
| `GET /api/kaali-teeri/games/{id}` · `DELETE` | One game; soft delete |
| `GET /api/kaali-teeri/bootstrap` | My Kaali Teeri games (players come from the shared bootstrap) |
| `GET /api/kaali-teeri/leaderboard` | `period` = today/week/season/all, `sort` = points/wins/made; ETag |
| `GET /api/kaali-teeri/players/{id}/stats` · `/games` · `/{a}/vs/{b}` | Profile (the `playerStats` fields), games, head-to-head |
| Share links | `/api/games/{id}/links` and public live/recap accept any kind; public bodies carry `kind`; `/l/` and `/r/` pages use the game's name and redirect to its path (`/kaali-teeri?live=…`) |

### 3.3 Validation
`app/domain/kaali_teeri/` mirrors `cards.ts`, `auction.ts`, `calls.ts`, `scoring.ts`, `validate.ts`, `stats.ts`.
`422 invalid_game {reason, handIndex}` with reasons: `players`, `rules`, `dealer`, `hands`, `auction`, `bid`, `trump`,
`called`, `played_by`, `team_points`, `times` (`hands` is new vs the plan: bad index, unfinished hand before the
last, finished game whose last hand isn't done, hand after the to-1000 end, unknown phase).

### 3.4 Fixtures
Copy `contract/fixtures/kt-*.json` (format in `contract/README.md`, validity at `now` = 2026-12-11T13:30Z). Tests:
every valid fixture validates and derives exactly `expect.hands` / `expect.gamePlayers` / `summary`; every
`kt-invalid-*` gives its `reason` and `handIndex`; `kt-set-stats` matches the stats and head-to-head endpoints.
