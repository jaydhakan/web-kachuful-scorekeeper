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
