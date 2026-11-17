# Achievements and awards for every game: the plan

Written 2026-11-17 for Jay to approve before any code. A working doc: never committed, deleted when the feature is
built, tested and committed in both repos. Everything below was checked against frontend `3fe89e0` and backend
`413fbd0` (both `main`, matching production).

**What you approve:** the four catalogues in §3 to §6 (codes, names, rules, thresholds) and the answers in §12.
Everything else is how I'll build it.

---

## 1. What we're building

Today only Kachuful has achievements, ladders, daily awards, monthly seasons and an activity feed. Spades has 10
device-only achievements (never stored, never shown for online tables). Kaali Teeri and Ishaara have none.

After this work, **every game has the full set**:

| Piece                                             | Kachuful  | Spades | Kaali Teeri | Ishaara |
| ------------------------------------------------- | :-------: | :----: | :---------: | :-----: |
| Moments (round / hand / turn), shown live         | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Game-end achievements, shown on the winner screen | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Career achievements and ladders (levels)          | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Daily awards                                      | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Monthly seasons (champion, runner-up, third …)    | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Achievements page, Awards page, Activity feed     | ✓ (today) |   ✓    |      ✓      |    ✓    |
| Stored on the server, synced across phones        | ✓ (today) |   ✓    |      ✓      |    ✓    |

**Kachuful does not change** (no code, name or rule changes; its pages look the same). **Out of scope** (later,
separate): Wrapped for the other games, the new card-flip "Unlock" animation (next plan, Part D1), and the
progression ideas in Part D4 (records, ranks, crown, belt).

**Totals:** Kachuful 67 (unchanged), Spades 59, Kaali Teeri 58, Ishaara 46.

---

## 2. Rules every catalogue follows

- **Computable from stored data only.** Each rule below was checked against what each game actually saves (§7).
  Nothing needs a new field in a saved game.
- **Groups:** `moment` (Kachuful calls it a round, Spades and Kaali Teeri a hand, Ishaara a turn), `game`, `career`,
  `daily`, `season`. **Big** ones get the full-screen burst when earned live.
- **🙃 marks a "shame" achievement:** funny, never mean, never a burst, shown with a small 🙃 tag.
- **Who gets it:** "you" means the player; "your team" or "your side" means every player on it gets their own copy.
- **Ladders** are levels of one count, shown as one card with progress ("23 / 50").
- **Codes are permanent.** Thresholds are settled now, before the first backfill. Changing a rule later deletes rows
  that no longer hold, so later changes become new codes.
- **Shared codes, separate games.** `winner`, `first_win`, `games_10` and so on exist in several games. A `game`
  column (§8) keeps them apart, so a Kachuful win never counts towards Spades.
- **Ties share.** A tie for the best value gives the award to everyone tied. Nothing is awarded when nobody passes the
  minimum.
- **Days and months** are counted in the app's time zone (`Asia/Kolkata`), as Kachuful's are.

---

## 3. Spades (59)

One catalogue for both forms, the **scorekeeper** (one phone) and **online** tables. **Where:** `both` works in
either form; `online` needs the trick-by-trick record, which only online tables keep. Online, a hand's achievements
go to whoever played that hand (a replaced seat keeps what it earned); game achievements go to whoever sat at the
end, the same rule the leaderboard uses.

**Changes to the 10 that exist** (they were never stored, so nothing is lost):

- Codes become snake_case like every other game: `iceCold` → `ice_cold`, `nilBreaker` → `nil_breaker`,
  `setThem` → `set_them`, `perfectPair` → `perfect_pair`.
- Nil Breaker works in both forms now (the scorekeeper stores each Nil bidder's tricks). It was online-only and so
  could never be earned.
- Exact now needs 4+ hands (a 1-hand game shouldn't count).

### Hand moments (13)

| Code           | Emoji | Name           | Earned for                                                          | Where  | Big |
| -------------- | :---: | -------------- | ------------------------------------------------------------------- | ------ | :-: |
| `boston`       |  🧹   | Boston         | Your team takes all 13 tricks                                       | both   |  ✓  |
| `ice_cold`     |  🧊   | Ice Cold       | Make a Nil                                                          | both   |     |
| `blindside`    |  🙈   | Blindside      | Make a Blind Nil                                                    | both   |  ✓  |
| `double_nil`   |  👯   | Double Trouble | You and your partner both bid Nil in the same hand and both make it | both   |  ✓  |
| `nil_breaker`  |  🔨   | Nil Breaker    | An opponent's Nil fails                                             | both   |     |
| `set_them`     |  🪓   | Set Them       | The other team is set                                               | both   |     |
| `high_roller`  |  🎰   | High Roller    | Your team bids 10 or more together (Nils count 0) and makes it      | both   |     |
| `bang_on`      |  🎯   | Bang On        | Your team bids 7 or more and takes exactly that many (no bags)      | both   |     |
| `sandbagged`   |  🛍️   | Sandbagged 🙃  | Your team takes the 10-bag penalty                                  | both   |     |
| `blind_spot`   |  🫣   | Blind Spot 🙃  | Your Blind Nil fails                                                | both   |     |
| `last_gasp`    |  ⏱️   | Last Gasp      | Your team reaches its contract on the 13th trick                    | online |     |
| `deuce_ace`    |  🪨   | Two Beats Ace  | Your 2♠ wins a trick, cutting the led suit's Ace                    | online |  ✓  |
| `one_man_band` |  🎺   | One-Man Band   | Take 7 or more tricks yourself in one hand                          | online |     |

### Game (11)

| Code            | Emoji | Name             | Earned for                                                     | Big |
| --------------- | :---: | ---------------- | -------------------------------------------------------------- | :-: |
| `winner`        |  🏆   | Winner           | Your team wins (a draw is not a win)                           |     |
| `comeback`      |  🔄   | Comeback         | Win after trailing by 150 or more after some hand              |  ✓  |
| `exact`         |  🌟   | Exact            | Win with every hand made and no bags, 4+ hands                 |  ✓  |
| `mercy`         |  😵   | Mercy            | Win by the mercy rule                                          |     |
| `shutout`       |  🚫   | Shutout          | Win while the other team's score never went above 0 (3+ hands) |  ✓  |
| `wire_to_wire`  |  🏁   | Wire to Wire     | Lead after every hand of a 5+ hand game, and win               |     |
| `photo_finish`  |  📸   | Photo Finish     | Win by 20 points or fewer                                      |     |
| `runaway`       |  🏃   | Runaway          | Win by 200 points or more                                      |     |
| `bag_collector` |  👜   | Bag Collector 🙃 | Your team takes the 10-bag penalty twice or more in one game   |     |
| `marathon`      |  🏃‍♂️   | Marathon         | Play a game of 15 hands or more                                |     |
| `night_owl`     |  🦉   | Night Owl        | Finish a game between 1 and 5 am                               |     |

### Career (20)

| Code(s)                                          | Name                                        | Earned for                                       |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------ |
| `first_win` `back_to_back` `hat_trick` `dynasty` | First Win, Back to Back, Hat-trick, Dynasty | Win 1, 2, 3, 5 games in a row (ladder)           |
| `games_10` `_50` `_100` `_250`                   | 10 … 250 games                              | Finish that many games (ladder)                  |
| `hands_100` `_500` `_1000`                       | 100 … 1k hands                              | Play that many hands (ladder)                    |
| `made_50` `_250` `_500`                          | 50 … 500 contracts                          | Your team makes that many of your bids (ladder)  |
| `nils_5` `_25` `_50`                             | Nil Specialist                              | Make that many Nils, blind included (ladder)     |
| `crew_10` `_25`                                  | Crew                                        | Share a table with 10 / 25 different people      |
| `perfect_pair`                                   | Perfect Pair 🤝                             | 10 wins with the same partner (once per partner) |

### Daily awards (7)

| Code          | Name              | Who                                           |
| ------------- | ----------------- | --------------------------------------------- |
| `day_pair`    | Pair of the Day   | The partners with the most wins together (2+) |
| `day_sharp`   | Sharpest          | Best contract rate (5+ bids)                  |
| `day_nil`     | Nil of the Day    | Most Nils made (1+)                           |
| `day_setter`  | Setter            | Most sets put on the other team (2+)          |
| `day_boston`  | Boston of the Day | Every team that took a Boston that day        |
| `day_bags`    | Sandbagger 🙃     | Most bags (5+)                                |
| `day_grinder` | Grinder           | Most hands played                             |

### Seasons, each calendar month (8)

Standings: **win rate, 10+ games in the month** (ties: more games first).

| Code               | Name               | Who                                       |
| ------------------ | ------------------ | ----------------------------------------- |
| `season_champion`  | Season Champion 👑 | 1st in the standings                      |
| `season_runner_up` | Runner-up          | 2nd                                       |
| `season_third`     | Third Place        | 3rd                                       |
| `season_sharpest`  | Sharpest Bidder    | Best contract rate (40+ bids)             |
| `season_nil`       | Nil Specialist     | Most Nils made                            |
| `season_pair`      | Pair of the Month  | Best pair by win rate (6+ games together) |
| `season_iron`      | Iron Player        | Most games                                |
| `season_climber`   | Climber            | Biggest rise in rank since last month     |

---

## 4. Kaali Teeri (58)

**Thresholds scale with the deck:** "80% of the deck" is 200 with one deck and 400 with two. The whole deck is 250 or 500. **Sides:** the bidder plus the players who played a called card are the bidding side; everyone else defends.
**Caveat:** Stuck With It only counts hands entered with the full auction. A hand entered quickly, or edited
afterwards, doesn't store whether the bid was forced.

### Hand moments (10)

| Code            | Emoji | Name          | Earned for                                                       | Big |
| --------------- | :---: | ------------- | ---------------------------------------------------------------- | :-: |
| `high_roller`   |  🎰   | High Roller   | As bidder, make a bid of 80% of the deck or more                 |     |
| `all_in`        |  💎   | All In        | As bidder, bid the whole deck and make it                        |  ✓  |
| `clean_sweep`   |  🧹   | Clean Sweep   | Your bidding side takes every point                              |  ✓  |
| `brick_wall`    |  🧱   | Brick Wall    | Your defending side takes every point                            |  ✓  |
| `lone_wolf`     |  🐺   | Lone Wolf     | As bidder, hold every called card yourself and make it           |  ✓  |
| `double_agent`  |  🕵️   | Double Agent  | As a partner, play two or more called cards, and the bid is made |     |
| `giant_killer`  |  🪓   | Giant Killer  | As a defender, beat a bid of 80% of the deck or more             |     |
| `stuck_with_it` |  🫠   | Stuck With It | Make a bid you were forced into                                  |     |
| `so_close`      |  😬   | So Close 🙃   | As bidder, miss by exactly 5 points                              |     |
| `overcooked`    |  🔥   | Overcooked 🙃 | As bidder, fail a bid of 80% of the deck or more                 |     |

### Game (11)

| Code           | Emoji | Name            | Earned for                                                   | Big |
| -------------- | :---: | --------------- | ------------------------------------------------------------ | :-: |
| `winner`       |  🏆   | Winner          | Finish first (a tie for first counts)                        |     |
| `comeback`     |  🔄   | Comeback        | Be last after a hand at or past halfway, then win (6+ hands) |  ✓  |
| `wire_to_wire` |  🏁   | Wire to Wire    | Lead after every hand of a 6+ hand game, and win             |     |
| `thousandaire` |  💰   | Thousandaire    | Reach 1,000 points in one game                               |     |
| `never_wrong`  |  ✅   | Never Wrong     | Bid 3+ times in a game and make every one                    |     |
| `kingmaker`    |  👑   | Kingmaker       | Win 3+ hands as a called partner in one game                 |     |
| `wooden_spoon` |  🥄   | Wooden Spoon 🙃 | Finish last                                                  |     |
| `blanked`      |  0️⃣   | Blanked 🙃      | Finish on 0 after 6+ hands                                   |     |
| `full_house`   |  🏠   | Full House      | Play a 10-player game                                        |     |
| `marathon`     |  🏃‍♂️   | Marathon        | Play a game of 20 hands or more                              |     |
| `night_owl`    |  🦉   | Night Owl       | Finish a game between 1 and 5 am                             |     |

### Career (23)

| Code(s)                                          | Name                                 | Earned for                                                    |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| `first_win` `back_to_back` `hat_trick` `dynasty` | First Win … Dynasty                  | Win 1, 2, 3, 5 games in a row (ladder)                        |
| `games_10` `_50` `_100` `_250`                   | 10 … 250 games                       | Finish that many games (ladder)                               |
| `hands_100` `_500` `_1000`                       | 100 … 1k hands                       | Play that many hands (ladder)                                 |
| `made_10` `_50` `_100`                           | 10 … 100 bids made                   | Make that many bids as bidder (ladder)                        |
| `partner_10` `_50` `_100`                        | Trusted Partner                      | Win that many hands as a called partner (ladder)              |
| `streak_3` `_5` `_8`                             | On a Roll, Unstoppable, Auction King | Make that many bids in a row as bidder (ladder)               |
| `crew_10` `_25`                                  | Crew                                 | Share a table with 10 / 25 different people                   |
| `partners_in_crime`                              | Partners in Crime 🤝                 | Win 10 hands on the same side as one person (once per person) |

### Daily awards (7)

| Code             | Name               | Who                                      |
| ---------------- | ------------------ | ---------------------------------------- |
| `day_star`       | Player of the Day  | Most points                              |
| `day_bid`        | Bid of the Day     | The biggest bid made (the single hand)   |
| `day_partner`    | Partner of the Day | Most hands won as a called partner (2+)  |
| `day_sharp`      | Sharpest           | Best made rate as bidder (3+ bids)       |
| `day_killer`     | Giant Killer       | Most bids beaten as a defender (2+)      |
| `day_overcooked` | Overcooked 🙃      | The biggest bid failed (the single hand) |
| `day_grinder`    | Grinder            | Most hands played                        |

### Seasons, each calendar month (7)

Standings: **win rate, 8+ finished games in the month** (points aren't fair across one-deck and two-deck games or
endless games).

| Code               | Name               | Who                                   |
| ------------------ | ------------------ | ------------------------------------- |
| `season_champion`  | Season Champion 👑 | 1st                                   |
| `season_runner_up` | Runner-up          | 2nd                                   |
| `season_third`     | Third Place        | 3rd                                   |
| `season_sharpest`  | Sharpest Bidder    | Best made rate as bidder (15+ bids)   |
| `season_kingmaker` | Kingmaker          | Most hands won as a called partner    |
| `season_iron`      | Iron Player        | Most games                            |
| `season_climber`   | Climber            | Biggest rise in rank since last month |

---

## 5. Ishaara (46)

**Limit:** the server records guesses per **team**, not per person (only the table screen can tap a card). So an
achievement can credit the **whole team**, the **clue-giver**, or **the team's guessers**, never one guesser alone.
Per-guesser achievements would need a "who's guessing" picker plus a backend change; I recommend leaving them out (§12).
Abandoned games earn nothing. A guess that was undone doesn't count (it's removed from the log).

### Turn moments (5)

| Code            | Emoji | Name                 | Earned for                                                            | Who      | Big |
| --------------- | :---: | -------------------- | --------------------------------------------------------------------- | -------- | :-: |
| `mind_meld`     |  🧠   | Mind Meld            | Your team finds every card of a clue for 3                            | team     |     |
| `one_word_four` |  🤯   | One Word, Four Cards | Your team finds every card of a clue for 4 or more                    | team     |  ✓  |
| `overtime`      |  ⏱️   | Overtime             | The bonus guess (one more than the clue) finds one of your cards      | team     |     |
| `trapped`       |  💣   | Trapped 🙃           | Your team's guess hits the trap                                       | guessers |     |
| `own_goal`      |  🥅   | Own Goal 🙃          | Your team turns over the other team's last card, handing them the win | guessers |     |

### Game (11)

| Code           | Emoji | Name          | Earned for                                                  | Who        | Big |
| -------------- | :---: | ------------- | ----------------------------------------------------------- | ---------- | :-: |
| `winner`       |  🏆   | Winner        | Your team wins                                              | team       |     |
| `flawless`     |  ✨   | Flawless      | Win with no wrong guesses (not by the other team resigning) | team       |  ✓  |
| `speedrun`     |  ⚡   | Speedrun      | Find all your cards in 4 clues or fewer                     | team       |  ✓  |
| `comeback`     |  🔄   | Comeback      | Win after being 4 or more cards behind                      | team       |  ✓  |
| `photo_finish` |  📸   | Photo Finish  | Win when the other team had one card left                   | team       |     |
| `lucky_escape` |  🍀   | Lucky Escape  | Win because the other team hit the trap                     | team       |     |
| `mastermind`   |  🎓   | Mastermind    | As clue-giver, win with 3+ clues and every clue fully found | clue-giver |     |
| `series`       |  🏅   | Series Winner | Win a best-of-3 match                                       | team       |     |
| `whitewash`    |  🧹   | Whitewash     | Win a best-of-3 match 2–0                                   | team       |  ✓  |
| `white_flag`   |  🏳️   | White Flag 🙃 | Your team resigns                                           | team       |     |
| `night_owl`    |  🦉   | Night Owl     | Finish a game between 1 and 5 am                            | everyone   |     |

### Career (19)

| Code(s)                                          | Name                | Earned for                                 |
| ------------------------------------------------ | ------------------- | ------------------------------------------ |
| `first_win` `back_to_back` `hat_trick` `dynasty` | First Win … Dynasty | Win 1, 2, 3, 5 games in a row (ladder)     |
| `games_10` `_50` `_100` `_250`                   | 10 … 250 games      | Finish that many games (ladder)            |
| `giver_wins_5` `_25` `_50`                       | Clue Master         | Win that many games as clue-giver (ladder) |
| `clues_25` `_100` `_250`                         | Wordsmith           | Give that many clues (ladder)              |
| `found_50` `_250` `_1000`                        | Card Hunter         | Your teams find that many cards (ladder)   |
| `crew_10` `_25`                                  | Crew                | Share a game with 10 / 25 different people |

### Daily awards (5)

| Code          | Name                  | Who                                                  |
| ------------- | --------------------- | ---------------------------------------------------- |
| `day_star`    | Player of the Day     | Most wins (2+)                                       |
| `day_giver`   | Clue-giver of the Day | Most cards found per clue (4+ clues)                 |
| `day_speed`   | Fastest Win           | The quickest win, first clue to last card (the team) |
| `day_trapped` | Trap Magnet 🙃        | Most trap hits (1+, guessers)                        |
| `day_grinder` | Grinder               | Most games played                                    |

### Seasons, each calendar month (6)

Standings: **win rate, 8+ games in the month**.

| Code               | Name                    | Who                                   |
| ------------------ | ----------------------- | ------------------------------------- |
| `season_champion`  | Season Champion 👑      | 1st                                   |
| `season_runner_up` | Runner-up               | 2nd                                   |
| `season_third`     | Third Place             | 3rd                                   |
| `season_giver`     | Clue-giver of the Month | Most cards found per clue (20+ clues) |
| `season_iron`      | Iron Player             | Most games                            |
| `season_climber`   | Climber                 | Biggest rise in rank since last month |

---

## 6. Kachuful (67, unchanged)

Kept exactly as they are; listed so the whole set is in one place.

- **Round (16):** `hot_3/5/8/12` (On fire … Untouchable), `cold_3/5/8/12` (Ice cold … Zombie), `grand_slam`, `ninja`,
  `high_roller`, `peak_performer`, `lone_wolf`, `odd_one_out`, `hooked`, `dealers_revenge`.
- **Game (12):** `winner`, `wire_to_wire`, `comeback`, `photo_finish`, `runaway`, `sharpshooter`, `perfect_game`,
  `wooden_spoon`, `zero_hero`, `marathon`, `full_house`, `night_owl`.
- **Career (25):** `first_win`, `back_to_back`, `hat_trick`, `dynasty`, `spoon_collector`, `podium_regular`,
  `personal_best`, `games_10…500`, `rounds_100…5000`, `made_100…1000`, `points_1000…10000`, `crew_10/25`, `rivalry_20`.
- **Daily (8):** `day_star`, `day_bang`, `day_ouch`, `day_hot`, `day_ice`, `day_sharp`, `day_grinder`, `day_hooked`.
- **Season (6):** `season_champion`, `season_runner_up`, `season_third`, `season_sharpest`, `season_iron`,
  `season_climber` (average per round, more than 50 rounds).

---

## 7. Where each game's data comes from (checked)

| Game        | Moments from                                                                                                                | Games and careers from                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Spades      | Scorekeeper: each hand's bids, blind flags, team tricks, Nil tricks. Online: the same plus every trick (`history[].tricks`) | `spades_game_players` (result, partner, bids made, nils), the saved game      |
| Kaali Teeri | `kt_hands` (bidder, bid, forced, partners, slots, team points, made, sweep) and the saved game (deck count)                 | `kt_game_players`, `kt_hands`                                                 |
| Ishaara     | The finished game's log (`games.payload.log`: clues, guesses with identity, penalties, times)                               | `ishaara_game_players` (team, role, won, found, trap, clues), `payload.match` |

Not available, so not in the lists: Kaali Teeri's partner reveal order, any trick detail in the Kaali Teeri and
Spades scorekeepers, one person's guesses in Ishaara.

---

## 8. Backend (`../backend-kachuful-scorekeeper`)

Written into `backend-requests.md` first, then built in the same task, following that repo's CLAUDE.md.

1. **Migration `0022`: add a `game` column** (`kachuful` | `spades` | `kaali-teeri` | `ishaara`; Spades' two kinds share
   `spades`):
   - `achievements.game TEXT NOT NULL DEFAULT 'kachuful'`, added to the unique key and the per-player index.
   - `activity.game` the same, with an index on `(game, created_at DESC, id DESC)`.
   - `closed_periods`: the primary key becomes `(game, period)`; existing rows are `kachuful`.
   - Downgrade: delete non-Kachuful rows, then drop the columns.
2. **The engine works for any game.** `AchievementsEngine` keeps how it works today (insert new, delete what no
   longer holds, keep `earned_at`), but takes a **rules module per game** (`app/domain/<game>/achievements.py`,
   `awards.py`). Kachuful's module is today's code, unchanged; its `PUT` stays inside its 120 ms budget.
3. **Hooks** (each recomputes that game's rows and the players' careers):
   - Spades scorekeeper: `SpadesGamesService.store` and `delete`.
   - Spades online: when a hand ends and in `finish_derived` (also `end_idle`, `delete`).
   - Kaali Teeri: `KtGamesService.store` and `delete`.
   - Ishaara: `IshaaraGamesService.finish_derived` (also `end_idle`, `delete`).
   - Player merges: recompute careers for every game.
4. **API** (every change is additive; the current app keeps working):
   - `?game=` on `GET /achievements`, `/activity`, `/awards/daily`, `/seasons`, `/seasons/{month}`; the default is
     `kachuful`.
   - New `GET /achievements/ladders?game=&playerId=`: the counts behind each ladder.
   - `earned` in the Kaali Teeri and Spades upload responses (today it's always `[]`).
   - The activity feed shows game summaries for every game (today only Kachuful's).
5. **Jobs:**
   - `close-day` and `close-season` close **every** game (`--game` limits it), so the timers don't change.
   - New `recompute-achievements --game <game>` walks every stored game once. It is idempotent.
   - `close-day --since <date>` closes past days for the backfill.
6. **Parity:** each game's TypeScript rules export golden fixtures (`contract/fixtures/<game>-achievements-*.json`,
   `<game>-awards-*.json`); the backend tests read the same files, as Kachuful's do.

## 9. Frontend

1. **A shared kit, `src/progression/`:**
   - Types (`AchievementDef` with `group`, `big`, `shame`; `Earned`; `Ladder`; `Award`) and `nextLevel` / `nearestLevel`.
   - The rules every game shares, written once: win streaks, the games ladder, crew, `night_owl`, `wooden_spoon`,
     `photo_finish`, and season standings with champion, runner-up, third and climber.
   - The UI moved out of Kachuful: the achievements grid with ladders, the awards page (today, other days, seasons),
     the activity feed, the end-of-game reel and the live pop.
   - A registry where each game plugs in `{ catalogue, strings, compute }`.
   - **Kachuful moves first, with no visible change**, behind its existing tests and fixtures. That proves the kit.
2. **Each game:** `src/games/<game>/domain/achievements.ts` and `awards.ts` (pure, with unit tests per code: earned,
   not earned, edge cases), its strings, and the pages wired into its hub.
3. **Where people see it (same as Kachuful):**
   - Each game's hub gets **Awards**, plus **Activity** when signed in.
   - The Achievements page opens from Awards and from each player's page. Spades' current grid on the player page is
     replaced by the real one.
   - The **Me** page lists each game's achievement count, each linking to that game's page.
4. **Live moments**, reusing Kachuful's pop and reel:
   - Kaali Teeri and the Spades scorekeeper: when a hand is confirmed, and the reel on the winner screen.
   - Spades online: on the hand summary, worked out from the public table state, so all four phones show the same
     thing with no backend change.
   - Ishaara: on the table screen when a turn ends (from the public log), and the reel at the end.
5. **Signed out:** the Kaali Teeri and Spades scorekeepers compute on the device, as Kachuful does. Online Spades and
   Ishaara are signed-in only, so they read the server.
6. **Bundle:** each game's progression pages and catalogue strings are a lazy chunk, so the first load doesn't grow
   (it's already over budget).

## 10. Build order (for the % reports)

| #   | Phase                                                                                                                      | Weight |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -----: |
| P0  | You approve this; `backend-requests.md` written                                                                            |     3% |
| P1  | Frontend kit; Kachuful moved onto it, no visible change, all tests green                                                   |    12% |
| P2  | Backend: migration 0022, engine per game, `?game=`, ladders route, jobs, recompute CLI; Kachuful unchanged (`make verify`) |    12% |
| P3  | **Spades**: TS rules + tests + fixtures, Python mirror + golden tests, hooks, pages, live moments, e2e                     |    22% |
| P4  | **Kaali Teeri**: the same                                                                                                  |    18% |
| P5  | **Ishaara**: the same (server computes; the app shows)                                                                     |    15% |
| P6  | Activity for every game, Me page, docs (`ARCHITECTURE.md`, `TODO.md`), full checks in both repos                           |    10% |
| P7  | Deploy (only when you say), run the migration, recompute each game, close past days and months                             |     8% |

P3, P4 and P5 touch separate folders in both repos once P1 and P2 are in, so they can run as three parallel agents
(your call, §12).

**Done means:** frontend `typecheck`, `lint`, `vitest` and `test:e2e` green (load-only failures rerun alone);
backend `make verify` green; each game's e2e earns an achievement, sees the live pop and finds it on the page; the
pages are checked in all four themes, with loading, empty, no-results and error states.

## 11. Risks

- **Thresholds are educated guesses.** I can't see real play counts. They are settled before the backfill; after
  that, a change means a new code.
- **Hand-typed games** count the same as Kachuful's do today (the same trust).
- **Backfill load:** run per game, off-peak; it's idempotent.
- **Seasons with few players:** a month where nobody reaches the minimum has no champion, as in Kachuful.

## 12. Decisions (Jay, 2026-11-17)

All answered: lists approved as written; shame ones kept; season minimums 10 / 8 / 8; one Spades catalogue; no
per-person Ishaara guesses; P3 to P5 as parallel agents; at the end merge both repos to `main` and push.

The questions as asked:

1. **Approve the four lists** (§3 to §5), or tell me what to add, cut or rename.
2. **🙃 shame achievements:** keep them (recommended), or drop them?
3. **Season minimums per month:** Spades 10 games, Kaali Teeri 8, Ishaara 8. Does your group play enough for these?
4. **Spades:** one catalogue for the scorekeeper and online (recommended)?
5. **Ishaara per-person guesses:** leave them out (recommended), or add a "who's guessing" picker and the backend
   change for them?
6. **Parallel agents for P3 to P5** (one per game; faster), or one at a time?
7. **Deploy:** push and deploy both repos at the end, or stop before pushing?
