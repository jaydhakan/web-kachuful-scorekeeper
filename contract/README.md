# Golden fixtures (app → backend)

Generated from the app's TypeScript rules (`src/domain`) by:

```sh
EXPORT_FIXTURES=1 npx vitest run src/domain/fixtures.export.test.ts
```

Without `EXPORT_FIXTURES`, the same test fails if these files no longer match the rules, so they cannot drift from
what the app does. Copy `fixtures/` into the backend's `tests/fixtures/` (plan-backend §12.1).

## Files

- `game-*.json`: `{kind: 'game', name, game, expect}`. `expect` has `valid`, `endedAt`, `totals` (by game-local
  id), `places` (null until the game ends), `gamePlayers` (game_players rows), `roundScores` (round_scores rows)
  and `achievements` (round, game and career rows earned by that game alone). Times are evaluated at `now` =
  2026-11-19T06:30Z; the timezone is `Asia/Kolkata`.
- `invalid-<reason>.json`: one corrupted field each; `expect.reason` is the `invalid_game` reason (and
  `roundIndex` when it is about a round).
- `set-month.json`: `{kind: 'set', tz, now, games, expect}` with `leaderboard` (every metric × Today, Last 7 days,
  This month, Last month, All time, around 2026-10-11 in Kolkata), `daily` awards for three days, two `season`s,
  `career` achievements and every achievement of the set.

Row field names are the app's (`playerId`, `roundIndex`, `runHot`, …); the server's columns are their snake_case.
A player without a registry id would be `name:<name key>`; every fixture player has one.

## Rules the plan left open, as the app implements them

Tell Jay if any of these should change; both sides must agree.

- **Ended games:** finished → `finishedAt` (or `updatedAt`); active and untouched for 24 h with a round done →
  the last round's `doneAt` (auto-end). Places, wins and every game/career achievement count only ended games.
- **Leaderboard `games`** = games with a round done in the range; **`wins`/`winRate`** use games _ended_ in the
  range. A player appears when they have a round or an ended game in the range.
- **Ordering** among equal values: points, then rounds (both descending), then `playerId` ascending.
  Qualified rows always come before unqualified ones.
- **`rankDelta`** = previous rank − current rank (positive = moved up), against `[from − (to − from), from)`;
  null when unranked in either window. All time has no previous window.
- **Comeback:** last (ties included) after some round at or past halfway, _not counting the final round_, then won.
- **Photo finish / runaway:** sole winner only; margin to second place.
- **Wooden spoon / spoon collector:** the worst place, and only when not everyone tied.
- **Personal best:** a game total higher than every earlier ended game, from the 4th ended game on.
- **Crew** counts different people across ended games. **Rivalry 20:** when two rivalries reach 20 in the same
  game, only the alphabetically first `with` is earned that game.
- **Career rounds/made/points** are counted in `doneAt` order (ties: game id, then round index) and earned at that
  round. **Points** are the sum of positive round scores.
- **Daily:** Player of the day needs points > 0; Round of the day > 0 and Ouch of the day < 0 (earliest round wins a
  tie, players by id); Hot hand and Ice bucket need a run of at least 3; Most hooked at least 1; Sharpest at least
  10 rounds. Other ties earn together.
- **Season:** standings are the leaderboard for the month with `minRounds` 50 (strictly more). Sharpest also needs
  30 rounds; Iron = most games; Climber = biggest positive rise against last month, qualified in both.
