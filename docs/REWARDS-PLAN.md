# Rewards plan v2: the table, the crowns, the stories (and then the Sikke and the Wardrobe)

Written 2026-11-18 for Jay; v2 the same day, after a full read of the code. A working doc (never committed; delete when
it ships in both repos). Code facts were checked against `main` in both repos (frontend `d7a2e1d`, backend `123b12d`).
The sound side is detailed in [SOUND-PLAN.md](SOUND-PLAN.md); this plan only adds the reward sounds (§11).

**Status: waiting for approval (§17).** Nothing is built yet. 2026-11-20: Kachuful's medals (Badshah, Wazir,
Senapati) added as §6.7, with decisions 13–16.

---

## 0. What changed from v1, in one screen

v1 was an economy (Sikke) plus cosmetics (the Wardrobe) plus one crown (the Taj). Read against the code and against
how the group actually plays, it had these problems:

1. **The cosmetics were designed for avatars that are too small.** The avatars are on the table, but **26–44px**,
   not 40–56px: the mini table's seats are 32px, a crowded table's (11+ players) about 26px, and the full table's 44px
   (`lib/tableGeometry.ts`: `TD.full.R 22`, `TD.mini.R 16`, ×0.8 from `CROWDED_FROM 11`). Hats and malas don't read
   at 32px.
2. **Two games have no faces at all mid-game.** Ishaara's board and clue phone, and the Spades scorekeeper's Tricks
   and Summary steps, show only names (§2).
3. **The Taj mattered to one person a month.** Everyone else has nothing to chase between nights.
4. **The economy was timed for daily play.** The group plays about **one night a week**. At v1's numbers an epic took
   about seven weeks and the full catalogue about three years. A daily-rotating Bazaar would show its stock to people
   who open the app once a week.
5. **Coins came first and stories last.** People retell moments, crowns changing hands and rivalries, not balances.
   v1 built the ledger before anything anyone would see at the table.
6. **There was no shape to the evening.** Nothing marks the first game, the spike, the last game or the end of the
   night.
7. **Moments had no budget.** The queue caps 2 Moments a round (`fx/moments.tsx`) and silently drops the rest. Nothing
   stops a night of identical crown-change shows.

v2 fixes these, in this order:

1. **Presence:** faces at every table, a seat token that reads at 26px, and a **stage** avatar for the moments when
   one player owns the screen.
2. **Status:**
   - four marks that move: **Aaj ka Sitara** (tonight), **the Kursi** (beat the holder to take it), **the Taj**
     (month), **Legend** (all-time)
   - stat crowns from what each game really tracks
   - rivalries at the table
   - **medals in Kachuful** (§6.7): the board's top 3 play as 🥇 Badshah, 🥈 Wazir and 🥉 Senapati, with metal names,
     banter each round, a live chase and a takeover moment
3. **Stories:** the evening's arc and **Baithak Wrapped: the night**.
4. **Then the Sikke and the Wardrobe**, rescaled for weekly play, with **clothing** shown on the stage avatar.

## 1. Facts the plan stands on

- **Moments:**
  - `fx/moments.tsx` has the `MomentQueue`:
    - `moment`-tier specs play one at a time, by `PRIORITY` (`smallUnlock 1`, `bigUnlock 2`, `verdict 3`,
      `gameEnd 4`)
    - at most `cap` (2) a `scope`; a game end is never capped
    - each `id` plays once
    - over the cap a moment returns `'capped'` and **is dropped**
    - `beat` and `tick` specs run at once, unqueued
    - a ceiling of `MOMENT_MAX_MS 2500` / `GAME_END_MAX_MS 4000`
    - a tap layer or Escape skips
  - `useCurrentMoment` lets a screen hold or dim.
  - Pieces in `fx/ui/`:
    - `UnlockCard`: drop, turn, sheen, at most 2.5s
    - `MomentPop`: big cards through the queue, small cards as at most 3 plus "+N"
    - `Stamp` (SET, BOSTON, SOLD, 1000)
    - `SeatSpotlight`: the table dims and a light travels seat to seat, at most 1.6s, `pointer-events: none`
    - `EmojiRain`
- **Sound:** `fx/sound.ts`, 19 synthesised sounds with tiers, under the "Sounds" setting (default Big moments). See
  SOUND-PLAN.md.
- **Avatar:** `components/ui/Avatar.tsx` has `AvatarFill` (the emoji, with the photo faded in over it), drawn inside
  each caller's own container. `Avatar` and `Dot` (`ui/Dot.tsx`) are thin wrappers. There are **97 call sites in 72
  files**. The felt table (`components/ui/Table.tsx`) draws its own seat containers around `AvatarFill`, and already
  supports:
  - `bids` (a bubble and a squash-pop when a bid lands)
  - `marks` (✓/✗ once the hand settles)
  - `badges` (a role under the seat)
  - `cur` (the turn rim), `warn`, `hl`, `dealer`, `first`
- **Podiums:** `ui/PodiumLight.tsx` (`Crown`, `Spotlight`), `ui/Podium.tsx` (end of game), `ui/RankBoard.tsx`
  (boards; the top-3 reveal once per board key), `progression/SeasonPodium.tsx`.
- **What each game ranks** (§6.1 uses these):
  - Kachuful: `domain/leaderboard.ts`, with `METRICS` `avgPerRound, points, wins, winRate, accuracy, bestRound,
    longestHot, games, rounds`; tallies also hold `worstRound, longestCold, hookHits`.
  - Spades: `domain/boards.ts`, sorts `wins, rate, made`; tallies `bidsMade, nils(Made), blindNils(Made), bags, sets`
    and the rates.
  - Kaali Teeri: `domain/boards.ts`, sorts `points, wins, made`; tallies `handsBid, bidsMade`.
  - Ishaara: `domain/boards.ts`, sorts `wins, rate, found`; tallies `wordsFound, wrongPicks, trapHits, clueGames,
    clueWins, cluesGiven, avgClueNumber, penalties`.
- **Seasons, days and awards on the server:**
  - Seasons are monthly: Kachuful on points per round, the rest on win rate with `seasonMin`.
  - Daily and season awards are **computed live on read** for the open period and frozen by `close-day` /
    `close-season`.
  - Per-day tallies exist: `player_day`, `kt_player_day`, …
  - `progress_game` (`app/services/progression/hooks.py`) runs **in the same transaction** as every game write.
- **Achievement catalogues** (codes as on `main`):
  - Kachuful: 52, including `hot_3…12`, `cold_*`, `hooked`, `dealers_revenge`, `perfect_game`, `wooden_spoon`,
    `day_star`, `season_*`.
  - Spades: 45, including `boston`, `double_nil`, `nil_breaker`, `deuce_ace`, `last_gasp`.
  - Kaali Teeri: 43, including `all_in`, `clean_sweep`, `giant_killer`, `kingmaker`, `thousandaire`.
  - Ishaara: 31, including `mind_meld`, `one_word_four`, `trapped`, `own_goal`, `speedrun`.
  - None is hidden today.
- **Rivalries already exist as data:**
  - `GET /api/players/{a}/vs/{b}` and each game's H2H page.
  - The device has the same facts for signed-out Kachuful and Kaali Teeri (`GameProgression.device`).
- **Kachuful's live page** already has spectator reactions (`LiveReactions`) and predictions (`LivePage.tsx`).
- **Nothing exists yet for:** currency, XP, inventory, frames, titles, outfits, a crew.

## 2. Avatar audit: where faces show today

Sizes are on a 390×844 phone. "Table" means the shared felt (`ui/Table.tsx`): full seats are 44px, mini seats 32px, a
crowded table (11+) ×0.8.

| Game                   | Screen (file)                                                                                    | Avatar?                  | Size        |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------------ | ----------- |
| **Kachuful**           | Deal / round start (`round/RoundStart.tsx:224`)                                                  | yes, table               | 44 / 32     |
|                        | Bidding: the bidder hero (`round/Bidding.tsx:42`) + table (`round/Turn.tsx:262`, `full` on round 1, else `mini`) | yes          | hero 52 (31 on short screens) / 32–44 |
|                        | Playing (same `Turn.tsx` table)                                                                  | yes                      | 32–44       |
|                        | Results rows (`round/Results.tsx:94`) + table (`:38`)                                            | yes                      | 40          |
|                        | Round summary rows (`round/Summary.tsx:316`) + mini table (`:251`)                               | yes                      | 40 / 32     |
|                        | Streak burst (`components/StreakCelebration.tsx:261`)                                            | yes                      | large       |
|                        | Winner (`screens/Winner.tsx`, `Podium` + `Dot` 24/40)                                            | yes                      | podium + 40 |
|                        | Large screen: bid pane hero (`desk/BidPane.tsx:53`), score panel (`desk/ScorePanel.tsx:57`), wide table | yes             | 64–72 / 34–40 / 68 |
|                        | Live page (`pages/LivePage.tsx:107`)                                                             | yes                      | small       |
| **Kaali Teeri**        | Deal (`setup/Deal.tsx:66`), auction table (`hand/bidding/BidTable.tsx:166`)                       | yes, table               | 32–44       |
|                        | Auction speaker (`hand/bidding/Auction.tsx:47`)                                                  | yes                      | 44          |
|                        | Call: the winner of the auction (`hand/Call.tsx:103`)                                            | yes                      | 48          |
|                        | Play: table (`hand/Play.tsx:47`) + "played by" (`:205`)                                          | yes                      | 32–44 / 28  |
|                        | Result rows (`hand/Result.tsx:75,153`)                                                           | yes                      | 36 / 40     |
|                        | Summary rows (`hand/Summary.tsx:243`)                                                            | yes                      | 44          |
|                        | Winner (`screens/Winner.tsx`, `Podium` + `Dot` 40)                                               | yes                      | podium + 40 |
|                        | Viewer (`viewer/Viewer.tsx`), scoreboard sheet (`sheets/Scoreboard.tsx:40`)                      | yes                      | small       |
| **Spades scorekeeper** | Bids (`table/screens/hand/Bids.tsx`, `Seat` + `Dot` 40)                                          | yes                      | 40–48       |
|                        | **Tricks** (`table/screens/hand/Tricks.tsx`)                                                     | **no, names only**       | —           |
|                        | **Hand summary** (`table/screens/hand/Summary.tsx`)                                              | **no, names only**       | —           |
|                        | Winner (`table/screens/Winner.tsx`, `Dot`)                                                       | yes                      | `Dot`       |
| **Spades online**      | Felt seats (`online/table/Felt.tsx` → `ui/Seat.tsx:247`), with bid bubble, Nil halo, dealer chip  | yes                      | 48 (others) / 40 (me) |
|                        | Winner (`online/table/Winner.tsx:170`), live view (`online/live/LiveView.tsx:168`)                | yes                      | —           |
| **Ishaara**            | Waiting / teams (`Waiting.tsx:87,194`, `setup/Teams.tsx`)                                        | yes                      | —           |
|                        | **Board** (`board/Board.tsx`, `TurnPanel.tsx`: the clue-giver is a name only, `:92`)             | **no**                   | —           |
|                        | **Clue phone** (`clue/*`)                                                                        | **no**                   | —           |
|                        | **Win** (`screens/Win.tsx`: team colours, no faces)                                              | **no**                   | —           |

**Conclusion:**

- **The table is there.** Kachuful and Kaali Teeri seat everyone round a felt for the whole round, and online Spades
  has a full felt.
- **Two problems remain:**
  1. **Size.** Most seats are 32px, so the seat can carry a frame and one status mark, not an outfit (§4).
  2. **Gaps.** Ishaara's board, clue phone and win screen, and the Spades scorekeeper's Tricks and Summary steps (§3).

## 3. Avatars at the table

### 3.1 Two kinds of avatar, one component

- **The seat token** (every seat, row and dot, 26–56px):
  - the face (emoji on colour, or the photo), plus the **frame** as the ring, plus **one** status pip
  - plus transient **reaction glyphs**
  - nothing below the chin and nothing above the head, so no layout anywhere changes
- **The stage avatar** (72px and up, only when one player owns the screen):
  - the head-and-shoulders bust with the full outfit (§4)
  - used by: the winner reveal, a crown changing hands, a stat crown won, the unlock card's "worn by", the Wardrobe,
    player pages, the podium's 1st place, Player Cards, and the rivalry line at the deal

Both come from one `AvatarFill`, which gains an optional `stage` mode. The seat token is the default, so the 97 call
sites change nothing, and each place that becomes a stage opts in.

**How the room sees it:** players spend the evening as seat tokens (frame, mark, reactions), and **step up to the
stage at the big moments**. The seat avatar rises out of the table and grows into the bust (a FLIP: transform from the
seat's box to the centre), plays the moment, and settles back. That's where clothes are seen, by everyone, at exactly
the moments people look up.

### 3.2 Per game: the chosen layout

**Kachuful (phone, 390×844):** keep the existing table and hero; add the marks, the reactions and the stage.

```
┌──────────────────────────────────────┐
│ Round 7 of 13 · ♥ trump    🔊  ⋯     │  top bar (quick mute, SOUND-PLAN §7)
├──────────────────────────────────────┤
│  (◉)  RIYA bids               [  3 ] │  bidder hero 52px: face + frame + headwear
│  👑 Taj · 🪑 Kursi                   │  her marks, as words, under the name
├──────────────────────────────────────┤
│            .-''''''-.                │
│      (◉)2 /          \ (◉)1          │  seats 32–44px: face + frame + 1 pip
│     🪑   |   ♥  13    |   ⭐         │  pip = her highest mark (Kursi, Sitara…)
│      (◉)  \          / (◉)👑         │  bid bubbles as now
│            '-......-'                │  turn rim on the bidder, as now
├──────────────────────────────────────┤
│  [0][1][2][3][4][5][6][7]  ← keypad  │  unchanged: input never moves
└──────────────────────────────────────┘
```

- **Summary:** the rows (40px) show each player's reaction glyph for the round (§5.2). The **new-leader crown drop
  already exists** (`Summary.tsx:345`); it stays the in-game leader mark, and the Taj is drawn differently (§6).
- **Large screen:** the wide table's 68px seats are big enough for the **hero tier** (headwear and neckwear, §4.3);
  the bid pane's 64–72px hero is a stage.

**Kaali Teeri:** the same. The auction speaker (44px) and the Call card (48px) take the **hero tier**: the auction
winner wears their headwear on the SOLD card. When there are 2+ partners, the partner reveal flight lands on the seat
with a **✓ hop** (§5).

**Spades scorekeeper (the gap):** add a **four-seat strip** above the trick entry and the hand summary. Each seat is
36px, grouped by team, with the bid under it and the Nil halo reused from `ui/Seat.tsx`.

```
┌──────────────────────────────────────┐
│  SUN  (◉)4  (◉)NIL💦  │  MOON (◉)3 (◉)5 │  36px tokens, team-tinted, bids under
├──────────────────────────────────────┤
│  Tricks: Sun  [ 8 ]   Moon [ 5 ]     │  existing entry, unchanged
│  …                                   │
```

Compact mode on short screens (`@h-short`): the strip becomes initials-free 28px dots with the bid beside them in one
line.

**Spades online:** it already has the best table (48px felt seats with a bid bubble, Nil halo and dealer chip). Add the
pip, the reactions and the stage. The 48px seats take the hero tier.

**Ishaara (the gap):**

- **Board:** a **team strip** above the board, with Sun's faces and Moon's faces (28px). The **clue-giver is
  enlarged** (44px) with a "thinking" idle (a slow 2% breathe; still when reduced) while the clue is pending. The
  guessers' faces nod (a 4px dip) on a right pick and shake on a trap.
- **Win:** the winning team's faces go **stage** in a row, and the MVP (`screens/mvp.ts` already picks one) gets the
  bust.
- **Clue phone:** only that player's own face (it's their phone). Nothing for the room.

```
┌──────────────────────────────────────┐
│ ☀ (◉)(◉)[(◉◉)]   vs   (◉)(◉)(◉) ☾    │  28px; the clue-giver 44px, ringed
│   "Dev: 2 · RIVER"                   │  the clue, as now
├──────────────────────────────────────┤
│  ▢ ▢ ▢ ▢ ▢                           │
│  ▢ ▢ ▢ ▢ ▢     the word grid,        │
│  ▢ ▢ ▢ ▢ ▢     unchanged             │
```

### 3.3 Compact mode and the rules

- **Scores and input come first.** Nothing added here moves a keypad, a result toggle or a primary button. Every
  addition lives in space that's already there (the seat, the row's avatar, the hero) or in a strip that collapses on
  `@h-short` / `@h-tiny`, which the screens already use.
- **One pip per seat.** It's the highest-ranked mark the player holds: Taj > Kursi > Legend > Sitara > streak 🔥. The
  rest show as words under the hero name and on the player page.
- **Reactions never cover a number.** They sit on the avatar's top-right quadrant, last at most 1.2s, and use
  `pointer-events: none`.

## 4. Avatar model and clothing

### 4.1 Face or bust: the decision

| Option                                              | Reads at 26–44px seats       | Clothing visible      | Photos              | 72 files                    | Performance                   |
| --------------------------------------------------- | ---------------------------- | --------------------- | ------------------- | --------------------------- | ----------------------------- |
| A. Face + accessories everywhere (v1)               | no: hats and malas are mush at 32px | barely         | ok                  | unchanged                   | many small SVGs on every row  |
| B. Bust everywhere                                  | no, worse: the face shrinks to 60% | yes, but tiny  | odd crops           | **every container changes** | heavy                         |
| C. Full body                                        | no                           | yes                   | no                  | rewrite                     | heavy, 3D-ish art             |
| **D. Seat token + stage bust (recommended)**        | **yes**: face + ring + 1 pip | **yes, where people look** | photo face on an illustrated bust works | **unchanged** (stage is opt-in) | only 1–6 busts on screen at once |

**D wins.** The seat stays legible and cheap, and the clothes get the moments people watch. A photo avatar becomes a
"portrait in costume": the round photo is the face, and the illustrated outfit sits below it like a cut-out.

### 4.2 What's on the stage bust (back to front)

1. **Aura (Roshni):** behind everything.
2. **Outfit (Libaas):** the shoulders and chest, under the face disc.
3. **The face disc:** the emoji or photo, as today.
4. **Neckwear (Gala):** over the outfit's collar.
5. **Headwear (Sar):** on top. **The Taj or Kursi crown replaces headwear** in that game.
6. **Frame (Ghera):** the ring around the face disc.
7. **Badge (Billa):** pinned to the outfit's chest (not the face).
8. **Honour pip:** top-right of the face disc.
9. **Transient:** the reaction glyph, the bid bubble.

### 4.3 Size rules

| Rendered size                                    | Tier    | Shows                                                                                     |
| ------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| under 32px (dots, crowded seats, small rows)     | dot     | face; the frame as a 2px ring in its main colour; the pip                                 |
| 32–47px (seats, result and summary rows)         | seat    | face; the full frame; the pip; reactions                                                  |
| 48–71px (heroes: bidder, SOLD card, online seats, wide table) | hero | + headwear and neckwear (cropped to the disc's box)                            |
| 72px and up (stage)                              | stage   | the full bust: outfit, aura, badge, everything                                            |

The size is measured once per container (`ResizeObserver`, shared) and is never a prop the 72 files pass.

### 4.4 Clothing: the Libaas slot

The outfits are flat SVG, drawn in the **cloth tokens**, a new set of 8 cloth colours per theme in `themes.css` and the
theme files, so all four themes stay right and no hex reaches a component. Each outfit comes in 3–6 colour variants.
Everything is gender-neutral, and anyone picks anything.

| Outfit                          | Rarity    | Notes                                                    |
| ------------------------------- | --------- | -------------------------------------------------------- |
| Kurta                           | common    | 6 colours; the default free outfit at level 2            |
| Hoodie                          | common    | "the cousin who codes"                                    |
| Office shirt and tie            | common    | the Office set                                            |
| Cricket whites                  | common    | the Cricket set                                           |
| Plain jersey with your number   | rare      | you pick the number; **no team logos or colours of real teams** |
| Nehru jacket over kurta         | rare      |                                                          |
| Hand-knit sweater ("mummy ne banaya") | rare | the Sardi set                                           |
| Raincoat                        | rare      | the Monsoon set                                          |
| Shawl drape                     | epic      | not the Champion's Shaal: that one is woven and honour-only |
| Dupatta drape / saree pallu drape | epic    | anyone can wear either                                   |
| Sherwani                        | epic      | the Shaadi set                                           |
| Lungi-banian                    | legendary | for laughs: "Sunday mode"                                |

**Sets** (wear all four pieces for a flourish on the stage bust):

| Set        | Outfit           | Sar          | Gala           | Ghera              | Flourish when complete                |
| ---------- | ---------------- | ------------ | -------------- | ------------------ | ------------------------------------- |
| Shaadi     | sherwani         | safa         | gold chain     | marigold-string frame | a petal puff when you take the stage |
| Cricket    | whites           | cricket cap  | whistle        | stumps frame       | a ball bounces once off the frame     |
| Monsoon    | raincoat         | umbrella     | muffler        | raindrop frame     | three raindrops slide down the ring   |
| Office     | shirt and tie    | —            | ID lanyard     | spreadsheet-grid frame | a tiny "Out of office" tag flips   |
| Sardi      | hand-knit sweater | monkey cap  | muffler        | frost frame        | a puff of breath                      |

A set's flourish plays only on the stage, once per appearance, at most 600ms, with a still version for reduced motion.

**Out:**

- religious or sacred marks (tilak, bindi or sindoor, any religious headwear such as a dastar or skullcap) **as items
  at all**
- the Gandhi topi (it reads as political now)
- real team kits or logos
- anything that mocks a region or community

Festival items (Diwali lights, Eid lantern frame, Christmas hat) are celebrations, never jokes, and the set of
festivals is broad (§8.3).

### 4.5 The Wardrobe (dressing room)

- **The page:** one page (`/wardrobe`).
- **The preview:**
  - a **large stage bust** (about 220px) on a felt backdrop in your theme
  - under it, the same look as a seat token at 32px and as a hero at 52px, so you see what the table will see
- **Slots:** a slot row (Libaas, Sar, Gala, Ghera, Roshni, Billa, Khitaab), each with a horizontal shelf of owned
  items plus locked ones (shown dimmed, with how to get them). A colour-variant picker sits under an outfit.
- **"Try on" anything** from the Bazaar here, including what you don't own (marked "not yours yet").
- **Buttons:** "Shuffle" puts on a random owned look. "Saved looks" holds 3 slots ("Office night", "Shaadi season").
- **States:** a skeleton while loading; error and retry; offline shows the cached look and saving is disabled with a
  reason.

## 5. Juice: how each event feels

### 5.1 The shape

Every event has **anticipation → hit → follow-through**, sized to its rarity:

- **Ticks** (taps):
  - feedback within 100ms, then gone
  - a press scale of 0.97
  - a flick or knock sound
  - a 10ms haptic
- **Beats** (each round's story):
  - played **on the seat tokens**: a hop, shake or glow, plus a reaction glyph
  - at most 1.2s, never blocking
- **Moments** (rare):
  - **the stage**: the seat rises into the bust in the centre, the hit (a stamp, crown or mala), and it settles back
  - at most 2.5s (4s for a game end), with tap or Escape to skip

All of it is transform and opacity only. Each has a still version for reduced motion: the glyph or stamp is shown and
hidden, with no travel.

### 5.2 Avatar states (on the seat tokens and rows)

| State      | When (existing data)                                             | Motion (transform/opacity)                           | Glyph   |
| ---------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------- |
| Confident  | the bid was made (Kachuful result, Kaali Teeri bid made, Spades contract made) | a 6px hop, squash on land (reuses `BID_POP`) | ✓ (the existing `marks.pos`) |
| Shocked    | a missed bid; a Spades set; a Kaali Teeri failed bid             | a ±4px shake ×3, 240ms                               | ✗ / 💥  |
| Sweating   | a Spades Nil live; Kachuful bid 0 with the round in progress     | a drip glyph bobs 2px (idle, at most 2 on screen)    | 💦      |
| Smug       | in-game leader after the reveal                                  | a 3° tilt and back, once                             | ✨      |
| Sulking    | last place after the reveal, 3+ rounds in                        | the token sinks 3px and stays until the next reveal  | ☁️      |
| On fire    | a Kachuful `hot_*` streak live (`StreakCelebration` data)        | a pip flame flickers (opacity only)                  | 🔥N     |

Rules:

- **Idle motion only on the current-turn seat and on states that need it** (at most 2 idle animations on screen).
- **Everything is still under reduced motion and on low-end devices.** The low-end reset already exists for
  `.mat-*`.
- **The glyphs are text emoji**, so there's no art cost and they work in every theme.

## 6. Status and crowns

### 6.1 Four marks that move, per game

| Mark                               | Who                                                                                   | Timescale    | Source (existing or new)                                                          | Pip |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------- | --- |
| **Aaj ka Sitara** (tonight's star) | the leader of today's daily standing (`day_star` where it exists; Spades: most wins today, then made rate) | today (Kolkata) | daily awards are **already computed live on read**; the new part is publishing the holder | ⭐ |
| **The Kursi** (the chair)          | one per game. **Beat the holder in a game you both played and you take it.** The first holder is the first finished game's winner | until taken | **new**, derived from finished games' final ranks (§6.3) | 🪑 |
| **The Taj** (the month's crown)    | #1 in this month's season standing, once past `seasonMin`; in Kachuful the Taj is the 🥇 **Badshah**'s (§6.7) | the season   | season standings exist; the new part is the `crowns` table and the change events  | 👑 |
| **Legend**                         | the most season titles in that game, all-time (ties share; at least 2 titles)         | all-time     | `season_champion` rows exist; count them                                          | 🏛️ |

- **Week is cut.** For a group that meets weekly, "this week" and "tonight" are the same mark.
- **The in-game leader's crown** (Kachuful `Summary.tsx:345`, the podium's `Crown`) stays as it is, and the Taj is
  drawn differently (jewelled, with a tilt), so they're never confused.

### 6.2 Stat crowns (live, from what each game tracks)

These are the season awards that already exist, **shown live during the month** instead of only at the close. A
holder sees them as words under their hero name and on their player page and card; they're never a seat pip.

| Game        | Stat crowns (season award code → crown)                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Kachuful    | `season_sharpest` → **Nishanebaaz** (best `accuracy`) · `season_iron` → **Lohe ka** (most rounds) · `season_climber` → **Charhta Sooraj** (biggest climb) · plus all-time board leaders on `bestRound` (Big Round) and `longestHot` (Hot Hand) |
| Spades      | `season_sharpest` (made rate) · `season_nil` → **Nil ka Nawab** · `season_pair` → **Jodi No. 1** · `season_iron` · `season_climber`         |
| Kaali Teeri | `season_sharpest` · `season_kingmaker` → **Kingmaker** · `season_iron` · `season_climber`                                                  |
| Ishaara     | `season_giver` → **Ishaaron ka Ustaad** (best clue-giver) · `season_iron` · `season_climber`                                               |

No new rules: the same codes, the same golden fixtures, just a holder published live.

### 6.3 The Kursi in detail

- **Taking it:** a finished game where the holder sat. The best-ranked player who finished **above** the holder takes
  it (ties at the top: the game's winner, then the earlier seat). In team games (Spades, Ishaara, Kaali Teeri
  partners), anyone on the winning side takes it, so a team win can hand it to both, and they **share** it until one of
  them loses it. A holder absent from the game keeps it.
- **Defences:** every finished game the holder sat in and didn't lose it adds **+1 defence**. The reign (games
  defended, days held) is shown and is a record.
- **At the table:**
  - **round 1's deal shows a line:** "🪑 Riya holds the Kursi · 6 defences"
  - when it changes hands, **"Kursi chheeni!"**: the chair glyph slides from the old seat to the new one, with
    `SeatSpotlight` from seat to seat, a gavel, and the old holder's token doing the **sulk**
- **Why it's the best idea here:** it changes hands **every few games**, any player can take it **tonight**, and it
  turns every game into "beat Riya". It costs one derived table and one rule.
- **Data:** `kursi(game, holder_ids[], since_game_id, since_at, defences)` plus `kursi_reigns` (history). It's
  rewritten in `progress_game` in the same transaction; an edited or voided game recomputes from that game onward,
  using the finished-games order.

### 6.4 Chasing and defending (no stakes)

- **Bounty:** when the **Taj or Kursi holder** is at the table, the round-1 line says "Beat Riya: +40 🪙". Whoever
  finishes above them earns it, **once per challenger per holder per week** (so two friends can't farm it by trading
  games).
- **"Defended" moments:** a holder who wins a game against 3+ challengers gets a **Beat**: the crown glints and the
  defence count ticks up on their seat.
- **Longest reign:** a record (§8), shown in the Hall of Fame later and in the Trophy Cabinet now.

### 6.5 Rivalries at the table

- **At round 1's deal (a dead spot today):** one **table intel line** picks the most interesting fact about the people
  seated:
  1. a crown at stake ("🪑 Kursi: Riya, 6 defences")
  2. a rivalry ("Dev has beaten Asha 7 of their last 9")
  3. a streak about to fall ("Kabir: 🔥4 weeks")
  4. a milestone ("Riya's 100th game")

  At most one line, on screen for the deal's duration (no extra wait).
- **Nemesis:** on your player page, the player who's beaten you most often (min 5 games together). At the table it
  shows only as the rivalry line, never as a label on someone's seat.
- **Data:** the H2H endpoint exists per pair. New: `GET /api/table-intel?game=&players=` returns the line candidates for
  the seated players in one query set. Signed-out Kachuful and Kaali Teeri compute the rivalry line on the device from
  the archive (their device progression already has the facts).

### 6.6 How a crown looks and moves

- **Taj:**
  - jewelled, sits tilted 8° on the head on hero and stage, a pip on seats
  - **idle:** on the stage, one glint every 6s
  - **won:** it drops from above with a bounce (anticipation lift 4px, drop, squash) and a bell
  - **lost:** "Taj chheena!". The crown lifts off the old holder, **wobbles in the air**, arcs to the new holder, and
    the old holder's token does the sulk. A shehnai stinger plays. It's funny, not cruel: the old holder's line reads
    "Riya held it 9 days" (proud, not mocking).
- **Kursi:** the chair glyph slides between seats, then a gavel.
- **Sitara:** a star pip twinkles in once (opacity), with no show; it changes too often for a show.
- **Legend:** a pip only, never animated (permanence).

### 6.7 Kachuful's medals: Badshah, Wazir, Senapati (added 2026-11-20, from Jay)

The leaderboard's top three **wear their rank at the table**. Kachuful first; the other games copy it once it has had a
real night. The 🥇 is the Taj's holder, so **the Taj and the Badshah are one thing**: the crown is the Badshah's.

**Who gets a medal**

- **The board:** this month's season standings (`awards.ts` `season()`): `avgPerRound`, ranked only past
  `SEASON_MIN_ROUNDS` (50). Same board as the Taj and `season_champion`, so the medal at the close of the month is the
  title the player is given.
- **The titles:** 🥇 **Badshah**, 🥈 **Wazir**, 🥉 **Senapati**. Ties share the medal (both are Badshah).
- **Early in the month** nobody has 50 rounds yet. Until 3 players qualify, last month's medallists keep theirs,
  marked "defending" (a thin ring, no shine). Decision 14.
- **Signed out:** the device ranks from its own archive, as its boards already do. Signed in: the server's standings
  (the same `crowns` table as the Taj, with ranks 2 and 3 added). Decision 15.

**1. Names in metal**

- Wherever a medallist's name shows in a game (the seat label, the bid list, score rows, the round summary, the
  winner screen, the live page), it's drawn in their metal, with the medal glyph after it.
  - 🥇 gold letters; a light sheen sweeps across every ~8s (a gradient layer moved with `translateX`, as the unlock
    card's sheen)
  - 🥈 silver letters; a cooler glint every ~14s
  - 🥉 bronze letters; no sheen
- The seat token gets a matching thin metal ring (the frame slot, §3.1); the pip slot still shows one status pip.
- **Tokens:** `--medal-gold/silver/bronze` exist with `-hi`/`-lo`. As text, light themes need darker shades, as
  `--gold-tx` already does for gold: add `--silver-tx` and `--bronze-tx` in `themes.css` and each theme file.
- **Reduced motion and low-end devices:** the metal letters, no sheen. At most one sheen runs at a time (§5.2's idle
  cap).

**2. At the deal**

- One medallist seated: the table intel line (§6.5) becomes *"👑 Badshah Riya table pe hai"*, and their seat glows
  once.
- Two or more seated: a 1.2s **VS card** in the deal, *"Badshah Riya vs Wazir Dev"*. It uses the deal's dead time
  (§7.1), so nothing waits.
- No medallist seated: nothing. It stays special.

**3. Banter each round (taunts and praise)**

At most **one line a round**, on the round summary (a pause, never during bidding). Lines are picked from a pool by a
seed of the game id and round, so the table and every live viewer see the same line. First match wins:

| # | What happened                                         | Example lines                                                                 |
| - | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1 | 🥇 is the only one who missed                          | *"Poori table ne kar diya, sirf Badshah reh gaye 😬"*                          |
| 2 | 🥇 missed and a non-medallist made a bigger bid        | *"Asha ne Badshah ko pachaad diya!"*                                           |
| 3 | 🥇 missed two rounds in a row                          | *"Riya ka sona aaj peetal lag raha hai"*                                      |
| 4 | 🥇 missed                                              | *"Badshah bhi chook gaye 👀"* · *"Takht thoda hil raha hai…"*                  |
| 5 | The hook fell on 🥇                                    | *"Hook ne Badshah ko bhi nahi chhoda 🪝"*                                      |
| 6 | 🥇 made a bid of 5 or more                             | *"Badshah hi keh de!"* · *"Badshah ho toh aise 👑"*                            |
| 7 | 🥇 is the only one who made it                         | *"Ek akela Badshah"*                                                          |
| 8 | 🥇 bid 0 and made it                                   | *"Chupke se kaam ho gaya"*                                                    |
| 9 | 🥈 or 🥉 passed a higher medallist in this game's score | *"Wazir ki nazar takht pe hai 👀"*                                             |

- **Who gets roasted:** only medallists. Everyone else is only ever praised for beating one.
- **Tone:** cheeky, never mean. No line about anything but the round. Decision 13 sets how spicy.
- **On the token:** 🥇 missing plays the Shocked beat (§5.2) with a gold flicker. Making a big bid plays a slightly
  taller hop.
- **Cooldown:** the same line kind not twice in 3 rounds. The pool has 4+ lines per kind.
- **Switch:** "Table banter" in Settings, on by default.
- **Strings** live in `src/games/kachuful/strings`, with the rules as a pure function in the domain (`banter.ts`,
  with unit tests per row).

**4. The chase, live**

- After each round, the standings are recomputed with this game's rounds counted, using `chase()`, which already
  exists.
- If someone at the table would pass the Badshah if the game ended now, the Badshah's letters show a **crack**: a
  hairline overlay faded in with opacity. The chaser gets an *"On track for 🥇"* chip.
- It clears if the Badshah pulls ahead again. The same goes for 🥈 and 🥉, as a chip only, without the crack.
- It's a projection, worked out on the device; the real change is decided at game end.

**5. The takeover (game end)**

- **When:** the game is finished and the new standings have a new 🥇. It plays as the game-end moment's second part,
  after the podium, and is merged with a Kursi change if both happen (§13 rule 7).
- **The show** (2.5s, skippable):
  1. the screen dims
  2. the gold letters **peel off the old Badshah's name** (scale and fade) and fly to the new one's
  3. a 🥇 flips, gold confetti falls, and the `shehnai` plays
  4. the line: **"Naya Badshah: Dev!"**
- **Silver and bronze changes** play as a 0.8s swap of the letters, with no dim.
- **The old Badshah** gets a proud line: *"Riya was Badshah for 12 days"*.
- **Reduced motion:** the names change colour and the line shows.
- **Defended:** a Badshah who finishes above both the Wazir and the Senapati at the same table gets
  *"Takht bacha liya 🛡️"* and a glint.

**6. Extras**

- **Giant Killer:** a new Kachuful achievement for finishing above the Badshah when you hold no medal. It needs a
  golden fixture first.
- **Wrapped (§7.2):** a medals card showing who held 🥇 tonight and who came close.
- **Feed:** "Dev is the new Badshah" (`crown` activity).

**7. The same treatment for every mark (Kursi, Sitara, Legend)**

Banter, the chase and the takeover aren't only for medals. Every mark a seated player holds (§6.1) gets them, through
the same `banter.ts` rule table and the same one-line-a-round budget. When two holders qualify for a line in the same
round, the 🥇 Badshah goes first, then the Kursi, then the Sitara.

| Mark             | At the deal                                    | Banter (examples)                                                                                          | Live chase                                                          | Takeover                                                  |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| 👑 Taj = 🥇       | as above                                       | as above                                                                                                   | as above                                                            | "Naya Badshah!" (the Taj and the gold move together)      |
| 🪑 **Kursi**      | "🪑 Riya ki Kursi · 6 defences"                 | missed: *"Kursi hil rahi hai 🪑"* · only one to miss: *"Kursi pe baithe baithe so gaye?"* · big made bid: *"Kursi pakki"* | whoever is above the holder in this game's score: "Kursi ke kareeb" chip; the 🪑 pip wobbles | "Kursi chheeni!" (§6.3)                                   |
| ⭐ **Sitara**     | —                                              | missed: *"Aaj ka Sitara thoda dhundhla"* · big made bid: *"Sitara chamak raha hai ✨"*                     | "Tonight's lead in reach" chip when someone would pass them          | the ⭐ twinkles across (a beat, as §6.6)                   |
| 🏛️ **Legend**    | "🏛️ Legend Riya" in the intel line when no Badshah sits | rarely: only the respectful lines (a big made bid: *"Legend ho toh aise"*); never teased on a miss | —                                                                   | never moves in a game (permanent)                         |

- **Names:** the metal letters are only for the medals. The other marks keep their pip and add a title before the
  name in the summary and the banter ("Kursi wale Riya").
- **One player, several marks:** the line uses the highest mark only, so it's never "Badshah, Kursi wale, Sitara Riya".
- **The cap holds:** still one banter line a round in total, and crown takeovers count toward the 3 a night
  (§13 rule 4).

**Data:**

- Signed in, the server adds ranks 2 and 3 to the `crowns` table, publishes medal changes in `status.changes`
  (kind `medal`), and adds `medal` to the player summaries the game reads.
- Signed out, everything comes from the device's archive.
- The backend part goes in `backend-requests.md` at G0.

## 7. The session arc and Baithak Wrapped

### 7.1 A night, minute by minute (Kachuful, 4 games)

| Time        | Today                                            | With this plan                                                                                    |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 0:00 setup  | pick players, spin for the dealer                | seats fill with tokens and pips; who holds the Kursi and the Taj is visible before a card is dealt |
| 0:02 deal   | about 3s of cards flying (a **dead spot**)       | the **table intel line** (a crown at stake, a rivalry, a bounty)                                  |
| rounds      | bid, play, result, reveal                        | reveal beats on the tokens (hop, shake, sulk, smug); the in-game crown as now                     |
| mid-game    | a streak burst sometimes                         | as now, plus Sitara moving ("⭐ Dev takes tonight's lead") **once per game at most**              |
| game end    | podium, confetti                                 | the **stage**: the winner's bust rises, the mala drops, their Jashn plays; a Kursi change if any  |
| between games (a **dead spot**) | rematch button              | a **"Tonight so far"** strip on the winner screen: tonight's standing across games, the Kursi, bounties left |
| last game   | nothing special                                  | an optional **"Last game of the night"** toggle on rematch: the deal says "Final game", and the winner gets the long ceremony |
| end of night | the app is closed                               | **Baithak Wrapped: the night** on every phone                                                     |

### 7.2 Baithak Wrapped: the night

- **A night** is a run of finished games with gaps of 3 hours or less, grouped by the players who sat, across all
  games. It crosses midnight correctly; the daily awards' midnight cut doesn't.
- **Built on the server** when the last game is 3 hours old (the `close-day` timer gets a sibling, `close-nights`,
  every 30 minutes), or at once when someone taps "End the night".
- **The cards** (swipe, each 1 screen, shareable):
  1. **The night's winner:** the most wins, then the most points relative to the table. Stage bust, mala.
  2. **The biggest swing:** the largest single-round change. Kachuful: `bestRound`/`worstRound` per game (round
     facts in the payload). Kaali Teeri: the biggest hand. Spades: a Boston or a set.
  3. **MVP of each game.** Ishaara already has `mvp.ts`; Spades has `domain/mvp.ts`.
  4. **The bid of the night:** the highest bid made. **And the worst bid**, gently: the biggest miss, as "Brave call:
     Dev bid 7 on 8 cards". It's never a person's name with a mocking line; the copy is kind.
  5. **Crowns that moved:** Kursi, Taj, Sitara.
  6. **Achievements earned tonight.**
  7. **Sikke earned tonight** (once the economy ships), and anything bought or gifted.
  8. **The story of the night:** one generated line from the facts above ("Riya took the Kursi in game 2, defended it
     twice, and lost it to Dev in the last hand").
- **Who sees it:** everyone who sat (signed in) on their own phone, plus the feed (`night` activity kind). The table
  device shows it too.
- **States:** "Your night is being counted…" (empty, before close), error and retry.
- **Data:** finished games' payloads and the existing `player_day`-style facts; new table `nights(id, started_at,
  ended_at, players[], games[], data jsonb)`.

## 8. Surprise and delight (honest)

| Surprise                        | Rarity                                     | Detected by                                                                                     |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Hidden achievements**         | 2–3 per game, rare                         | add `hidden?: true` to `AchievementDef`; the catalogue shows "???" until earned; the same golden fixtures. E.g. Kachuful: every bid in a round is 0 and everyone makes it; Spades: `deuce_ace` becomes hidden |
| **Perfect game**                | rare                                       | exists (`perfect_game`); upgraded to a stage Moment                                             |
| **Firsts for the group**        | once ever                                  | server: the first-ever Boston, first 10-player Kachuful, first Ishaara speedrun across the app   |
| **Group milestones**            | about monthly                              | server: the crew's 100th or 250th game together (a game counts when 3+ of those players sat)    |
| **Your Nth game**               | 50, 100, 250, 500                          | `games_*` ladders exist; add a table-intel line and a Beat at the deal                          |
| **Festival table effects**      | on the day                                 | client, from a dated table in code: Diwali (diyas round the felt rim), Holi (one gulaal puff on the winner), Eid (a lantern string over the table), Christmas, New Year (a 12-o'clock confetti), Uttarayan (a kite crossing the deal). Opacity and transform only; off under reduced motion; never during input |
| **Birthday**                    | —                                          | **cut**: we don't store birthdays, and adding one is personal data for a small gain              |

## 9. Sikke: the economy (rescaled for weekly nights)

**Principles kept from v1:**

- no real money
- no loot boxes, gacha or wagering
- the server decides, in the same transaction as the game write
- recompute-safe, with an append-only ledger
- unaccounted players accrue and claim later
- the launch backfill and the "Pehle Waale" (day-one) badge

**Rescaled numbers** (a night is about 4 games; most of the group plays one night a week):

| Source                                              | Sikke                    |
| --------------------------------------------------- | ------------------------ |
| Finish a game (server-run online: +10)              | 30                       |
| Win                                                 | +25                      |
| Achievement: moment / game / career (`big` ×2)      | 5 / 10 / 25              |
| Ladder level                                        | 25 × level               |
| Bounty (§6.4)                                       | 40                       |
| Take the Kursi / each defence                       | 30 / 10                  |
| Tonight's Sitara (at the night's close)             | 30                       |
| Daily award / season award / **Taj at season close** | 15 / 100 / **300**      |
| Weekly streak, first game of the week               | 10 × weeks, max 50       |

- **A typical night is about 250–300 Sikke.**
- **Prices** (lowered after Jay's "not too hard to earn"):
  - common 100 (2–3 per night)
  - rare 300 (about 1 per night)
  - epic 750 (about every 3 weeks)
  - legendary 1,800 (about 6–7 weeks)
- **Cap:** 8 games per game kind per day.
- **Every number is checked in G3** by running the backfill over real history and printing what each regular would
  have. The prices are set from that, not from this table.

**Levels** (lifetime Sikke): a free item each level, and slots unlock as before. The names are Naya → Mehmaan →
Regular → Pakka → Ghar Ka → Baithak Ka Sitara.

**Sinks** (so coins stay worth something after the commons):

- colour variants (a cheap way to keep buying)
- gifting (items only)
- Chai Break streak freezes
- saved-look slots beyond 3
- later, the crew's Baithak room

## 10. The Bazaar (weekly)

- **Shelves:**
  - **Hafte ka Maal** (this week's stock): 6 items, refreshed **Monday 06:00 Kolkata**. At least 1 epic, a legendary
    about every 3rd week. It's seeded from the ISO week, so it's the same for everyone and testable. A weekly group
    sees every stock.
  - **Hamesha** (always): the commons and the colour variants.
  - **Your level's free item.**
- **Try on in the Wardrobe** (§4.5), **buy with a confirm sheet** (idempotent), then the unlock card with your stage
  bust **wearing it**.
- **Gifting** (items only, to your circle). The gift is opened as a stage moment **the next time the receiver is seated
  at a table** ("Riya sent you a Sherwani"), so the room sees it.
- **States:** loading, error, offline (browse the cache; buying disabled), signed out (explains).

## 11. Sound palette for rewards (adds to SOUND-PLAN.md)

SOUND-PLAN.md has the table sounds. Rewards add these, all synthesised, with no files:

| Sound              | Purpose                                     | Length  | Tier   | Priority          |
| ------------------ | ------------------------------------------- | ------- | ------ | ----------------- |
| `shehnai`          | Taj chheena (a reed glide up, a cheeky fall) | 0.9s   | moment | 3 (verdict)       |
| `ghungroo`         | unlock, level up, set completed (a jingle)  | 0.5s    | beat   | 2                 |
| `patakha`          | a stage win with a Jashn (a crack plus crackle) | 0.8s | beat   | with `fanfare`    |
| `dhol` (`fanfare`) | the winner on the stage                     | 1.4s    | moment | 4 (gameEnd)       |
| `gavel`            | Kursi chheeni                               | 0.3s    | moment | 3                 |
| `bell`             | Taj won at season close; Legend             | 1.2s    | moment | 4                 |
| `coin`             | "+🪙" counting on the winner screen          | 0.05s each, at most 8 | tick | — |
| `twinkle`          | Sitara changes                              | 0.3s    | beat   | 1                 |

That's **8 here and 13 in SOUND-PLAN.md, so 21 in all.**

**Optional voice pack** (later, off by default): 8–10 Hinglish callouts ("Kya baat hai!", "Taj chheena!", "Kursi
gayi!", "Ho gaya!"). These would be **real recordings** (Opus files, about 10 KB each, lazy). Whose voice (yours, a
friend's, licensed) is a decision (§17).

**Late-night quiet:** an option in the Sounds setting, "Quieter after 11 pm", on by default. After 23:00 local time it
switches ticks off and plays moments at half volume. No new key: it's a field in `baithak.fx`.

## 12. Moment catalogue

**Who sees it:**

- **T** = the shared table screen
- **O** = the person's own phone (user stream, or the next open)
- **F** = the feed

| Event                            | Trigger (exact)                                                                                   | Tier   | Visual                                                                                      | Sound              | Haptic              | Length  | Who   | Cap                                     | Reduced motion                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- | ------------------ | ------------------- | ------- | ----- | --------------------------------------- | -------------------------------------- |
| Bid made / missed (each player)  | client: the reveal's stage 1 (`useSumStages`), per result                                          | beat   | the seat hop + ✓ / shake + ✗                                                                | `made` / `missed` (pitched) | —          | 0.4s    | T     | merged per round                        | glyph shown and hidden                 |
| Sole miss                        | client: `Summary.tsx:107`                                                                         | beat   | the one token sulks, ☁️                                                                     | `womp`             | —                   | 0.8s    | T     | 1 a round                               | glyph                                  |
| Everyone made it                 | client: every result made                                                                         | beat   | all tokens hop in a wave                                                                    | `chime`            | `[12,40,18]`        | 0.8s    | T     | 1 a round                               | one ✓ row glow                         |
| Nil live / made / broken (Spades)| client: hand state; server for online                                                              | beat   | 💦 drip → halo (exists) / crack                                                             | — / `chime` / `crack` | as Spades now    | 0.6s    | T     | per player                              | as now                                 |
| The hook catches (Kachuful)      | client: `reducer.ts:174` `hookWarn`                                                               | beat   | the dealer's token gets a 🪝 glyph and a small tug down                                     | `hook`             | `[20,40,20]`        | 0.7s    | T     | 1 a round                               | glyph                                  |
| SOLD (Kaali Teeri)               | client: `Call.tsx` mount                                                                          | moment | the stamp (exists); the winner's hero token wears their headwear                            | `gavel`            | `[20,40,20]`        | 1.0s    | T     | 1 a hand                                | stamp, still                           |
| New in-game leader               | client: `Summary.tsx:345`                                                                         | beat   | the crown drop (exists); the leader turns smug                                              | `crown`            | `[12,40,18]`        | 0.8s    | T     | 1 a round                               | as now                                 |
| Sitara changes                   | server: the upload response `status.changes` (kind `sitara`)                                      | beat   | ⭐ twinkles onto the seat                                                                   | `twinkle`          | —                   | 0.5s    | T     | 1 per game                              | the pip appears                        |
| **Kursi chheeni**                | server: `status.changes` (kind `kursi`) in the game's upload response                             | moment | the chair slides seat to seat + `SeatSpotlight`; the old holder sulks; "Kursi chheeni!"    | `gavel`            | `[20,40,20]`        | 1.6s    | T, O, F | 1 per game                            | the line + pip swap                    |
| **Taj chheena**                  | server: `status.changes` (kind `taj`)                                                             | moment | the stage: the crown lifts, wobbles, arcs to the new bust; the old holder's proud line      | `shehnai`          | `[20,40,20]`        | 2.2s    | T, O, F | 1 per game; 3 per night, then a beat  | crown pip swap + line                  |
| Medallist seated (Kachuful)      | client: the deal, a seated player with a medal (§6.7)                                             | beat   | intel line "👑 Badshah Riya table pe hai"; 2+ medallists: the VS card                       | —                  | —                   | 1.2s    | T     | 1 per game, in the deal                 | the line, still                        |
| Banter line (Kachuful)           | client: the round summary, `banter.ts` rule table (§6.7)                                          | beat   | one line under the summary; the medallist's token shakes or hops                            | — (the result's own sound) | —           | 0.6s    | T, live | 1 a round; same kind not twice in 3 rounds | the line, still                    |
| On track for a medal             | client: `chase()` with this game's rounds, after each round                                       | beat   | a crack on the holder's metal letters; "On track for 🥇" chip on the chaser                  | —                  | —                   | 0.4s    | T     | changes only                            | the chip, still                        |
| **Naya Badshah**                 | server: `status.changes` (kind `medal`, rank 1); signed out: the device's new standings          | moment | the dim, the gold letters peel and fly to the new name, 🥇 flip, gold confetti              | `shehnai`          | `[20,40,20]`        | 2.5s    | T, O, F | 1 per game; merged with a Kursi change | names change colour + line             |
| Wazir / Senapati changes         | as above, rank 2 or 3                                                                             | beat   | the metal letters swap between names                                                        | `twinkle`          | —                   | 0.8s    | T, O  | merged into one beat per game           | names change colour                    |
| Bounty won                       | server: `status.changes` (kind `bounty`)                                                          | beat   | "+40 🪙 bounty" chip from the old holder's seat to the winner's                             | `coin` ×3          | 10                  | 0.8s    | T, O  | 1 per game                              | the chip, still                        |
| Game win                         | client: the winner screen (`useReveal`)                                                           | moment | the winner's token rises to the **stage bust**, the mala drops, their Jashn                 | `fanfare` (+ Jashn) | `[12,40,18,40,30]` | 3.5s    | T     | 1 per game                              | the bust, still, the mala on           |
| Perfect game / hidden achievement| server: `earned` with `big` or `hidden`                                                           | moment | the unlock card (exists) with the stage bust                                                | `ghungroo` + `chime` | `[20,40,20]`      | 2.5s    | T, O, F | 2 per game (the queue)                | card face-up                           |
| Streak milestone (Kachuful `hot_*`) | client: `StreakCelebration` (exists)                                                           | beat (top tier: moment) | as now, on the token                                                       | `chime` (+`boom`)  | as now              | as now  | T     | as now                                  | as now                                 |
| Level up                         | server: the upload response `sikke.levelUp`                                                       | beat   | **own phone**: the level card; **table**: a ghungroo glint on the token only                | `ghungroo`         | —                   | 1.2s    | O (T glint) | batched at game end               | card, still                            |
| Set completed                    | client: on wearing the 4th piece                                                                  | beat   | the set's flourish on the Wardrobe bust                                                     | `ghungroo`         | 10                  | 0.6s    | O     | —                                       | still                                  |
| Gift opened                      | server: a pending gift + the receiver seated                                                      | moment | the stage: a box opens, the bust wears it, "from Riya"                                      | `ghungroo`         | `[12,40,18]`        | 2.0s    | T, O, F | 1 per game, at a pause                | the bust wearing it                    |
| Group milestone / first ever     | server: `status.changes` (kind `milestone`)                                                       | moment | the table's felt rim glows once; a stamp ("100th game together")                            | `bell`             | `[20,40,20]`        | 2.0s    | T, F  | rare by nature                          | the stamp, still                       |
| Festival effect                  | client: the dated table                                                                           | beat   | the rim decoration and one puff                                                             | —                  | —                   | 1.5s    | T     | once per game                           | none (static decor only)               |
| Night's Wrapped ready            | server: `close-nights`                                                                            | —      | a card on the landing page and the feed                                                     | —                  | —                   | —       | O, F  | once per night                          | —                                      |

## 13. Moment budget and queue rules

1. **Big shows only at pauses.**
   - A Moment triggered during **input** (bidding, results, the auction) is **held** until the next pause: the round
     summary, the hand summary, the winner screen, or the deal. A new `QueueOpts.pauseUntil(() => boolean)` holds the
     queue while the screen is in input.
   - Beats on tokens may play during input; they're `pointer-events: none` and never move a control.
2. **Per round or hand:** at most **1 Moment** (the cap drops from 2 to 1 for the scorekeepers; Spades online keeps 2).
   Beats merge, so 5 made results are one pitched run, not 5 sounds.
3. **Per game:** at most **3 Moments plus the game end**.
4. **Per night (per device):** at most **3 crown-change shows** (Taj, Kursi). After that, a crown change is a **Beat**:
   the pip swaps and a one-line toast plays. The count is kept in memory with a day stamp in `baithak.fx`.
5. **Cooldown:** the same moment kind twice within 2 rounds becomes a Beat the second time.
6. **Downgrade, don't drop.** A Moment over its cap becomes a small card (`MomentPop`'s small path) instead of
   vanishing (`'capped'` today means lost).
7. **Merge:** Moments of the same kind in the same scope combine ("Kursi and Taj to Dev!" is one stage, not two).
8. **Never wait:**
   - every Moment is skippable with one tap or Escape, and has a hard ceiling (2.5s, game end 4s)
   - the **next-round and rematch buttons are enabled the moment the screen shows**
   - a tap on the skip layer skips only, so there's no accidental action; the ceilings keep the wait short
9. **Speed:** a second tap during a Beat sequence finishes the whole sequence at once (the reveal jumps to its final
   state, as `Summary`'s tap-to-skip does today).

## 14. Fairness and farming: each new idea checked

| Idea                  | Risk                                                        | Fix / verdict                                                                                  |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Kursi                 | type fake games to take it                                  | needs a finished game with 3+ registry players, real rounds, signed in; the admin can void (recomputes); the reign history shows it. **Keep** |
| Bounty                | two friends trade wins for coins                            | once per challenger per holder per week; 3+ players. **Keep**                                  |
| Taj and stat crowns   | farm easy games                                             | the existing `seasonMin`, rates need minimums, same as the awards today. **Keep**             |
| Sitara                | the only player tonight                                     | needs a table of 3+; a day with 1 game gives no Sitara. **Keep**                              |
| Medals                | pad rounds to pass 50 and qualify; play only easy tables | the same `seasonMin` and finished-games rules as the Taj; the admin can void (recomputes). **Keep** |
| Banter                | a player singled out night after night                      | only medallists are teased, and only about the round; kind pool; "Table banter" off switch. **Keep** |
| Wrapped "worst bid"   | humiliation                                                 | kind copy only ("Brave call"); no 🙃 achievements in Wrapped. **Keep**                        |
| Gifts                 | coin laundering                                             | items only, never coins; can't gift to yourself or to players outside your circle. **Keep**   |
| Group milestones      | inflating counts                                            | counted from finished games only. **Keep**                                                     |
| Voice pack            | recording consent                                           | only voices that agreed, in writing; off by default. **Decision for Jay**                      |
| Predictions for Sikke (considered) | gambling-like                                  | **cut**; predictions stay just for fun (they already exist on the live page)                  |
| Daily login rewards (considered) | guilt nags                                       | **cut**                                                                                        |
| Mausam paid pass      | real money                                                  | **cut**; the free monthly track is also cut for now (§15)                                      |

## 15. Impact vs effort

Scores are 1–5; ratio = impact ÷ effort. **Above the line is built in this plan.**

| Idea                                                             | Impact | Effort | Ratio | Data                                         |
| ---------------------------------------------------------------- | -----: | -----: | ----: | -------------------------------------------- |
| **Kursi** (+ chheeni, defences, reigns)                          |      5 |      2 |  2.5  | new derived table from finished games        |
| **Table intel line** at the deal                                 |      4 |      2 |  2.0  | the H2H exists; new batch endpoint           |
| **Avatar states / reactions on seat tokens**                     |      4 |      2 |  2.0  | client only, existing reveal data            |
| **Moment budget and queue rules**                                |      4 |      2 |  2.0  | client only                                  |
| **Faces in Ishaara and the Spades scorekeeper**                  |      3 |      2 |  1.5  | client only                                  |
| **Stage avatar + winner on the stage**                           |      5 |      3 |  1.7  | client; art for busts                        |
| **Sitara (tonight)**                                             |      3 |      2 |  1.5  | daily standings live                         |
| **Taj (live, chheena)**                                          |      4 |      3 |  1.3  | `crowns` table                               |
| **Kachuful medals** (metal names, banter, chase, Naya Badshah)    |      5 |      2 |  2.5  | season standings and `chase()` exist; `crowns` ranks 2–3 |
| **Baithak Wrapped: the night**                                   |      5 |      4 |  1.25 | `nights` + payload facts                     |
| **Sikke + levels + backfill**                                    |      4 |      3 |  1.3  | ledger                                       |
| **Wardrobe + outfits + sets** (about 40 items of art)            |      4 |      4 |  1.0  | catalog, looks; the most art                 |
| **Bazaar (weekly) + gifting**                                    |      3 |      3 |  1.0  | catalog, ledger                              |
| **Stat crowns live**                                             |      2 |      2 |  1.0  | live awards exist                            |
| **Hidden achievements + firsts + milestones**                    |      3 |      3 |  1.0  | the catalogue flag; server checks            |
| ——— **cut line** ———                                             |        |        |       |                                              |
| Player Cards (shareable image)                                   |      3 |      3 |  1.0  | next plan: needs the bust art first          |
| Legend mark                                                      |      2 |      1 |  2.0  | trivial; **ships with the Taj** (a rider, not a phase) |
| Festival table effects                                           |      2 |      2 |  1.0  | next plan, before Diwali 2027                |
| Voice pack                                                       |      2 |      3 |  0.7  | recordings and consent                       |
| Mausam free monthly track                                        |      2 |      3 |  0.7  | weekly play makes a monthly track thin       |
| Baithak room (crew progression)                                  |      4 |      5 |  0.8  | a lot of art; later                          |
| Week crown                                                       |      1 |      1 |  1.0  | duplicates Sitara for a weekly group         |
| Commentary ticker                                                |      3 |      4 |  0.75 | later                                        |

## 16. Phases (reordered: presence and status before coins)

| Phase | What                                                                                                                                                          | Weight | Was           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: | ------------- |
| G0    | Decisions; `backend-requests.md`; the **art style sheet**: 1 bust, 2 outfits, 2 headwear, 1 frame, at 26/32/52/72/220px in all 4 themes, approved by Jay       |    5% | 5%            |
| G1    | **Presence:** `AvatarFill` tiers (dot, seat, hero, stage) by measured size; the pip slot; avatar states and reactions; faces in Ishaara and the Spades scorekeeper; the moment budget and queue rules (§13); the stage rise/settle helper | 20% | new |
| G2    | **Status and stories:** Kachuful's medals first (§6.7: Badshah, Wazir, Senapati, banter, the chase), Kursi, Sitara, Taj (+ Legend), stat crowns live, `status.changes` in upload responses and on the user stream, table intel, bounties (computed now, paid when G3 lands), the Night's Wrapped | 25% | was G3 (20%) |
| G3    | **Sikke:** the ledger, earn rules (rescaled), the hooks, backfill, levels, the wallet chip and ledger sheet, "+🪙" on the winner screen; bounties start paying | 15% | was G1 (20%) |
| G4    | **Wardrobe:** the catalog, owned items, looks; **outfits, sets and colour variants**; the art (about 40 items); the dressing room                              |   20% | was G2 (25%) |
| G5    | **Bazaar (weekly) + gifting** (the gift opened at the table) + hidden achievements, firsts and milestones                                                      |   10% | was G4 (15%) |
| G6    | **Ship:** docs, full e2e, `perf:budget`, the 4-theme responsive check, cleanup, merge                                                                          |    5% | 5%            |

**What moved and why:**

- **Presence comes first,** because everything else is invisible without it.
- **Status comes before coins,** because the Kursi and Wrapped are what the group will talk about, and they need no
  economy. They'd be good even if the Bazaar never shipped.
- **Mausam is cut** (§15), and **Player Cards** move to the next plan, because they need G4's bust art.

**Parallel work:** frontend and backend in every phase. In G1, the avatar tiers versus the Ishaara and Spades gaps. In
G2, Kursi/Taj on the server versus Wrapped. In G4, the art versus the dressing-room page.

## 17. Playtest plan (the first week with the real group)

**Ship G1 and G2 first, behind an admin "preview" switch** in app settings. That's the existing `app_settings`; no new
key on the device.

**Test at one real night:**

- Do people **notice** the pips and the Kursi line at the deal without being told?
- Does "Kursi chheeni!" get **a reaction out loud**?
- Does any show feel too long? Do people tap through the winner stage?
- Does input ever wait on an animation?
- Wrapped the next morning: who opened it, and was it shared?

**Measure** (all from data we already have, or kept on the device; **no analytics service**):

| What                                                    | How                                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Games per night                                         | `nights` rows (server)                                                                    |
| Return rate (weeks in a row with a night)               | the weekly streak data (server)                                                           |
| Skip rate per moment kind                               | a device counter in `baithak.fx` (skipped vs played), read in the moments lab; never sent |
| Moments that got a reaction out loud                    | Jay's notes on a one-page sheet during the night (moment, laugh/groan/nothing)            |
| Time from a round's confirm to the next round's first bid | the device's round timestamps (in the saved game already)                             |
| Wrapped opened / shared                                 | the server knows opens (a read); shares are unknown (a native share)                      |

**Success after 2 nights:**

- the Kursi line or chheeni is mentioned out loud each night
- the skip rate stays under 30% for every Moment
- confirm-to-next-bid doesn't get slower
- at least half the players open Wrapped

**If a moment's skip rate is over 50%, it's halved or made a Beat.**

## 18. Decisions for Jay (my recommendation first)

**Status (2026-11-18):**

- **Decide after the demo** (`docs/REWARDS-DEMO-PROMPT.md`): 1 (avatar model) and 3 (the Kursi and its name).
- **Decided by Jay:**
  - 4: one set of crowns for the whole app
  - 5: the Bazaar refreshes weekly
  - 11: late-night quiet is on by default
  - 12: Sikke, no real money, with the backfill
- **Left to me, decided as recommended:**
  - 2: presence and status first
  - 7: the §4.4 items, the removals, and lungi-banian as the joke legendary
  - 8: a night is games with gaps of 3 hours or less
  - 9: "worst bid" stays in, with kind copy and off when fewer than 3 players
  - 10: the voice pack comes later and is off by default; the voice is chosen when it's built
- **Decision 6:** prices lowered in §9 so coins come easily: an epic about every 3 weeks, a legendary about 6–7 weeks.
  This is still checked against the backfill.

1. **Avatar model:** **seat token everywhere plus a stage bust at big moments** (recommended), or accessories on every
   avatar (v1)?
2. **Order:** **presence and status first, coins second** (recommended), or the economy first as in v1?
3. **The Kursi:** build it now (recommended)? Keep the name "Kursi", or "the Belt"?
4. **Crown scope:** **one Kursi, Taj and Sitara per game for the whole app** (recommended while the app is one group),
   or per crew (needs a crew concept first)?
5. **Bazaar rotation:** **weekly, on Monday** (recommended), or daily?
6. **Economy pace:** an epic about monthly and a legendary about a season (recommended), to be checked against the
   backfill?
7. **Items:** the outfit list and sets in §4.4, the removals (Gandhi topi, religious items, real team kits), and
   lungi-banian as the joke legendary: OK?
8. **Wrapped's night:** **games with gaps of 3 hours or less** (recommended), or the calendar day?
9. **"Worst bid" in Wrapped,** with kind copy: in or out?
10. **Voice pack:** later and off by default (recommended); and whose voice?
11. **Late-night quiet** (after 11 pm) on by default: yes?
12. **Currency name Sikke, no real money, and the launch backfill:** still yes (v1's §12 1–3)?
13. **Banter tone (§6.7):** **friendly roast, as in the examples** (recommended), or saltier? Only medallists are teased.
14. **Medals early in the month:** **last month's top 3 keep theirs, marked "defending", until 3 players qualify**
    (recommended), or no medals until then?
15. **Signed-out games:** **medals ranked from the device's own archive** (recommended), or medals only when signed in?
16. **Titles:** 🥇 Badshah (Jay's), 🥈 **Wazir** and 🥉 **Senapati** (suggested): OK, or other names?
