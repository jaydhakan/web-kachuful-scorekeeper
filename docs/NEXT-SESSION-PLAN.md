# Next session plan: achievements for every game, Emerald Gilt card art, wow moments, and what else

Written 2026-11-16 at the end of the Spades build, for Jay to pick up the next day (on this laptop or another). It is
a working doc, committed on its own branch `docs/next-session-plan` at Jay's request so another laptop has it
(an exception to CLAUDE.md's rule); never merge it into `main`, and delete it and the branch once the work is done. Everything it says about the code
was checked against `main` in both repos on 2026-11-16.

---

## 0. Where things stand (read this first)

**Repos** (both on `main` only, pushed, no other branches, local and GitHub):

| Repo     | Path                                                | Last commit                                 |
| -------- | --------------------------------------------------- | ------------------------------------------- |
| Frontend | `~/workspace/personal/web-kachuful-scorekeeper`     | `3fe89e0` leaderboard opens on bid accuracy |
| Backend  | `~/workspace/personal/backend-kachuful-scorekeeper` | `413fbd0` merge: Spades                     |

**Deployed:** the backend is live at `https://play.vectanix.com` and reports version `413fbd0`, so pushing `main`
deploys it. The frontend's deploy is **unconfirmed**: `/spades` answered 200 but with the generic "Baithak" title, so
the live site may still be the old build. Check first thing (§3, item 1).

**Local dev now talks to production.** `npm run dev` proxies `/api` to `https://play.vectanix.com` (the proxy sends
production's Origin for the CSRF check and drops `Secure` from the session cookie). Anything you do signed in is real
data. For backend work, run the backend locally and use `npm run dev:local` (port 8000). `npm run dev:mock` is the
in-memory API. All Vite scripts use `--configLoader runner` (no more config warnings).

**Games** (all at their own path, registered in `src/platform/catalog.ts`):

| Game        | Kind                            | Where its rules live                      |
| ----------- | ------------------------------- | ----------------------------------------- |
| Kachuful    | scorekeeper                     | `src/games/kachuful/domain`               |
| Kaali Teeri | scorekeeper (auction + calls)   | `src/games/kaali-teeri/domain`            |
| Ishaara     | server-run word game (online)   | `src/games/ishaara/domain`, server mirror |
| Spades      | online (4 phones) + scorekeeper | `src/games/spades/domain`, server mirror  |

**How Jay wants work done** (memory: `sequential-work-after-spades-wave`): one thing at a time, in the main chat, no
subagents or worktrees unless he says so. Report progress as a % every ~5%. Conventional Commits, no co-author
trailer. Backend changes go through a `backend-requests.md` at the frontend root (temporary, never committed), then
are built in the backend repo in the same task. No new dependency without asking.

**Checks before calling anything done:** frontend `npm run typecheck && npm run lint && npx vitest run` (1,781 tests)
and the e2e suite `npm run test:e2e` (296 tests, ~5 min; rerun failures alone with `--last-failed --workers=1`);
backend `make verify` (ruff, mypy --strict, pytest; 1,213 tests, ~4 min).

---

## Part A. Achievements, awards and the "hub" pages for Kaali Teeri, Ishaara and Spades

### A1. Why only Kachuful has them

Kachuful was the first game and its progression system was built for it alone, end to end. When Kaali Teeri, Ishaara
and Spades came, each got the parts every game needs (history, leaderboard, player page, head-to-head) and the
progression system was left Kachuful-only because it is the biggest piece and is wired to Kachuful's data shapes in
both repos. Nothing stops the other games having it; it is simply unbuilt.

### A2. What Kachuful has (the bar to reach)

**Frontend**

| Piece           | Where                                                | What it does                                                                                       |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catalogue       | `games/kachuful/domain/achievements.ts` (408 lines)  | ~70 achievements in 5 groups: `round`, `game`, `career`, `daily`, `season`; `big` ones get a burst |
| Ladders         | same file, `LADDERS`, `ladderCounts`, `nextLevel`    | levelled tracks (hot streaks, wins 1/2/3/5, games 10…500, rounds, bids made, points, crew)         |
| Awards          | `games/kachuful/domain/awards.ts` (287 lines)        | daily awards (`day_star`, `day_sharp` …), seasons (monthly, min 50 rounds), Wrapped, `chase`       |
| Facts           | `games/kachuful/domain/timeline.ts`                  | one flat list of round and game facts every stat is computed from                                  |
| Profile         | `games/kachuful/domain/profile.ts`                   | profile stats, calendar heatmap, points over time, opponents, head-to-head                         |
| Strings         | `games/kachuful/strings/achievements.ts`             | each code's name and description                                                                   |
| Pages           | `games/kachuful/screens/pages/`                      | `AchievementsPage`, `AwardsPage`, `ActivityPage`, `WrappedPage`, `PlayerPage`, `H2HPage` …         |
| In-game moments | `components/AchievementReel.tsx`, `lastRoundMoments` | what a game earned, big moments first; round moments shown as they happen                          |

**Backend**

| Piece        | Where                                                                   | Notes                                                                                       |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Rules mirror | `app/domain/achievements.py`, `app/domain/awards.py`                    | Python copy of the catalogue and rules; parity via golden fixtures                          |
| Engine       | `app/services/achievements.py` (`AchievementsEngine`)                   | after every game write: recomputes that game's and players' achievements, keeps `earned_at` |
| Called from  | `app/services/games.py` (L356, L470), `merge.py`                        | Kachuful game saves and player merges only                                                  |
| Tables       | `achievements`, `activity`, `closed_periods` (`app/db/models.py` L854+) | see below                                                                                   |
| Jobs         | `app/jobs/close_day.py` (00:05), `close_season.py`                      | freeze a day's / month's awards and write feed items                                        |

The tables are almost game-agnostic already:

- `achievements(player_id, code, game_id → games.id, round_index, period, earned_at, data)`, unique on
  `(player_id, code, game_id, round_index, period)`. `games` holds **every** kind (`kind IN ('kachuful',
'kaali-teeri', 'ishaara', 'spades', 'spades-online')`), so `game_id` can point at any game. **But** `code` has no
  game, and a career or period row has no `game_id`, so "Kaali Teeri's achievements" can't be told apart.
- `activity(kind, player_id, game_id, achievement_id, data)`: the feed; same gap.
- `closed_periods(period PK, kind 'day'|'season', data)`: a day closes once **for the whole app**; a second game's
  day can't be stored.

### A3. What the other games have today

| Feature                        | Kachuful | Kaali Teeri | Ishaara | Spades                                                                   |
| ------------------------------ | :------: | :---------: | :-----: | ------------------------------------------------------------------------ |
| History, game recap            |    ✓     |      ✓      |    ✓    | ✓ (online tables too)                                                    |
| Leaderboard + podium           |    ✓     |      ✓      |    ✓    | ✓                                                                        |
| Player page                    |    ✓     |      ✓      |    ✓    | ✓ (stats, partners, vs you)                                              |
| Head-to-head page              |    ✓     |      ✓      |    ✓    | inside the player page                                                   |
| Achievements                   |  ✓ ~70   |      –      |    –    | **10, device only** (`domain/achievements.ts`, shown on the player page) |
| Ladders (levels)               |    ✓     |      –      |    –    | –                                                                        |
| Daily awards / seasons         |    ✓     |      –      |    –    | –                                                                        |
| Activity feed                  |    ✓     |      –      |    –    | –                                                                        |
| Wrapped (year in review)       |    ✓     |      –      |    –    | –                                                                        |
| In-game "you earned it" moment |    ✓     |      –      |    –    | –                                                                        |

### A4. The approach (recommended)

**Build one shared progression kit and give each game its own catalogue**, instead of copying Kachuful three times.

1. **Shared kit (frontend, `src/progression/`)**: game-agnostic types (`AchievementDef { code, emoji, group, big?,
ladder? }`, `Earned`, `Ladder`, `nextLevel`), the UI (achievement grid with locked/earned states, ladder progress,
   the unlock burst, the activity feed card, the awards card) and a tiny registry so each game plugs in
   `{ catalogue, strings, compute(facts) }`. Kachuful's pages move onto the kit **without changing what they show**
   (do this first, behind its existing tests; it proves the kit).
2. **Per-game catalogue + facts**: each game turns its own saved games into a flat facts list (like Kachuful's
   `timeline.ts`) and evaluates its catalogue over it. Pure, in `src/games/<game>/domain/achievements.ts`, mirrored in
   the backend's `app/domain/<game>/achievements.py`, with golden fixtures (`contract/fixtures/<game>-achievements-*`).
3. **Server is the source of truth when signed in**, the device computes when signed out, exactly as the boards work
   today. Spades' current 10 device-only achievements become the first server-backed ones.
4. **Database: give rows a game** (one migration, with a downgrade):
   - `achievements.game_kind TEXT NOT NULL DEFAULT 'kachuful'` (backfill = default), and add it to the unique key.
   - `activity.game_kind` the same way.
   - `closed_periods`: primary key becomes `(game_kind, period)`; existing rows are `kachuful`.
   - Codes stay readable and unprefixed (`boston`), since `game_kind` disambiguates.
   - **Alternative** (no migration): prefix codes (`kt.full_house`) and periods (`kt:2026-11-16`). Cheaper now but
     every query parses strings; not recommended.
5. **Engine per game**: generalise `AchievementsEngine` so `game()` and `career()` take the game kind and its rules
   module; call it from each game's save path (`kt_games.py`, `ishaara_games.py` / `ishaara_state.py` at finish,
   `spades_games.py` for the scorekeeper, `spades_tables.py` when an online hand / game ends).
6. **Backfill**: a CLI job `recompute-achievements --game <kind>` that walks every stored game once, so players get
   what they already earned. Idempotent (the engine keeps `earned_at` for rows that still hold).
7. **API**: the existing routes gain `?game=` (default `kachuful`, so the current app keeps working); write them
   into `backend-requests.md` first, as always.

### A5. Draft catalogues (to agree with Jay before building; thresholds checked against each game's rules)

Keep ~12–20 per game at first, plus ladders. Funny "shame" ones (like Kachuful's `wooden_spoon`) are part of the fun;
flag them as such in the UI.

**Spades** (rules: `src/games/spades/domain`; the 10 that exist now are marked ✓)

| Code             | Name           | Group  | Earned for                                                   |
| ---------------- | -------------- | ------ | ------------------------------------------------------------ |
| `boston` ✓       | Boston         | hand   | your team takes all 13 tricks (big)                          |
| `ice_cold` ✓     | Ice Cold       | hand   | a Nil made                                                   |
| `blindside` ✓    | Blindside      | hand   | a Blind Nil made (big)                                       |
| `nil_breaker` ✓  | Nil Breaker    | hand   | an opponent's Nil fails (online only: needs the tricks)      |
| `set_them` ✓     | Set Them       | hand   | the other team is set                                        |
| `sandbagged` ✓   | Sandbagged     | hand   | your team takes the 10-bag penalty (shame)                   |
| `comeback` ✓     | Comeback       | game   | a win after trailing by 150                                  |
| `exact` ✓        | Exact          | game   | a win with every hand made exactly                           |
| `mercy` ✓        | Mercy          | game   | a win by the mercy rule                                      |
| `perfect_pair` ✓ | Perfect Pair   | career | 10 wins with one partner                                     |
| `double_nil`     | Double Trouble | hand   | both partners make Nil in the same hand (big)                |
| `last_trick`     | Last Gasp      | hand   | make your contract on the 13th trick                         |
| `cut_king`       | Trump Card     | hand   | cut an Ace with a 2 of spades (online)                       |
| `shutout`        | Shutout        | game   | win while the other team never got above 0                   |
| ladders          | –              | career | games 10/50/100, wins 1/5/25, Nils made 1/10/25, Bostons 1/5 |

Daily awards: Boston of the day, Sharpest pair (most contracts made), Sandbagger of the day (shame).
Seasons: monthly, champion pair by win rate (min games), sharpest bidder by bids made %.
**Live moment:** online, the server includes earned codes in the hand-end frame; the summary sheet shows them (the
SET stamp and Nil halos already set the visual language).

**Kaali Teeri** (rules: auction to a `minBid`, step 5/10, the bidder calls partner cards, partners revealed as the
called cards are played; `TARGET = 1000`; 4–10 players, 1–2 decks). Verify thresholds in `domain/scoring.ts`.

| Code             | Name          | Group  | Earned for                                                                                     |
| ---------------- | ------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `top_bid`        | High Roller   | hand   | win the auction at the table's highest bid of the night                                        |
| `made_it`        | Called It     | hand   | as bidder, make your bid                                                                       |
| `max_bid_made`   | All In        | hand   | make the maximum possible bid (big)                                                            |
| `set_bidder`     | Giant Killer  | hand   | in the opposition, defeat a bid ≥ some threshold                                               |
| `secret_partner` | Undercover    | hand   | as a called partner, win the hand without being suspected (the last called card revealed late) |
| `solo`           | Lone Wolf     | hand   | the bidder wins when the called cards were the bidder's own                                    |
| `clean_sweep`    | Clean Sweep   | hand   | the bidding side takes every point                                                             |
| `forced_win`     | Stuck With It | hand   | win a hand you were forced to bid (shame-turned-glory)                                         |
| `first_to_1000`  | Thousandaire  | game   | first to the target                                                                            |
| `comeback`       | Comeback      | game   | win after being last at the halfway point                                                      |
| ladders          | –             | career | games, wins, bids made, partnerships won                                                       |

Daily: Biggest bid of the day, Best partner (most hands won as a called partner). Seasons: points per game.

**Ishaara** (server-run; teams Sun/Moon, clue-giver gives one word + number, the trap card ends the game,
`EndedBy = all-found | trap | resign | abandoned`). Clue-giver and guesser roles count separately.

| Code            | Name                 | Group  | Earned for                                          |
| --------------- | -------------------- | ------ | --------------------------------------------------- |
| `mind_meld`     | Mind Meld            | turn   | a clue for 3+ fully found in one turn (big at 4+)   |
| `one_word_four` | One Word, Four Cards | turn   | a single clue for 4 that the team finds             |
| `bonus_card`    | Overtime             | turn   | the team uses the +1 guess to find a leftover card  |
| `flawless`      | Flawless             | game   | win with no wrong guesses                           |
| `trap_dodger`   | Tightrope            | game   | win when only the trap and one other card were left |
| `trapped`       | Trapped              | game   | your guess hit the trap (shame)                     |
| `speedrun`      | Speedrun             | game   | win in 4 turns or fewer                             |
| `comeback`      | Comeback             | game   | win from 4+ cards behind                            |
| ladders         | –                    | career | games, wins, clues given, cards found               |

Daily: Best clue-giver (cards found per clue), Sharpest guesser. Seasons: win rate (min games).

### A6. Build order (phases, with rough weights for progress reporting)

| #   | Phase                                                                                                                                                                         | Weight |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: |
| P0  | Agree catalogues and the DB approach with Jay (A4.4, A5); write `backend-requests.md`                                                                                         |     5% |
| P1  | Shared kit `src/progression/`; move Kachuful onto it, no visual change, all tests green                                                                                       |    15% |
| P2  | Backend migration (`game_kind`), engine generalised, Kachuful unchanged (`make verify`)                                                                                       |    10% |
| P3  | **Spades**: catalogue v2 front + Python mirror + fixtures, engine hooks (scorekeeper save, online hand/game end), backfill job, Achievements page, live moment in the summary |    20% |
| P4  | **Kaali Teeri**: the same                                                                                                                                                     |    15% |
| P5  | **Ishaara**: the same (server-run, so only the server computes; the app reads)                                                                                                |    15% |
| P6  | Daily awards and seasons per game (`close_day` / `close_season` take a game)                                                                                                  |    10% |
| P7  | Activity feed across games on Me; e2e per game; TODO and docs; deploy both                                                                                                    |    10% |

Wrapped for every game is a later, separate project.

### A7. Risks and how to handle them

- **Changing a rule later un-earns rows.** The engine already deletes rows that no longer hold; keep codes stable and
  add new codes instead of redefining old ones.
- **Parity drift** between TS and Python: golden fixtures per game, like the existing `contract/fixtures`.
- **Backfill load**: run per game, batched, off-peak; it's idempotent.
- **Online Spades replacements**: a seat replaced mid-game (`SpHand.players`) earns hand achievements for whoever
  played that hand, and game ones only for the seat at the end, the same rule the boards use.
- **Bundle budget is already red** (§3): put each game's achievements page in its own lazy chunk.

---

## Part B. Emerald Gilt card art

### B1. The facts

- Emerald Gilt's **real deck art** (photos of the emerald-and-gold deck, redrawn flat, used with the rights holder's
  written permission for this app and this public repo only, **not** share images, icon, splash or manifest):
  **4 faces + the back**: K♠, K♦, K♣, Q♥, `back.webp`, `back-mini.webp` (`src/assets/themes/emerald-gilt/`,
  see `SOURCE.md`).
- **Missing: 48 of 52 faces.** Every A, 2–10 and J, plus Q♠ Q♦ Q♣ and K♥.
- **Nothing is broken today.** Every missing face has our **own stand-in** drawing (`standins/card-*.svg`, ivory face,
  gold rule, outlined rank and pip, 240 KB for all 48), wired in `styles/themes/emerald-gilt.css` (`.card-standin
[data-card=…]`). Spades' `SpCard` already layers: flat face → stand-in → photo (`--art-card-<rank>-<suit>`), so in
  Emerald Gilt Spades shows 4 photo faces and 48 stand-ins. The stand-ins' corner index sits in the left ~20% of the
  card, so it stays readable in the hand's narrow strips.
- **Spades needs the full deck far more than the other games**: Kachuful and Kaali Teeri mostly show a trump or a
  called card; Spades shows a 13-card hand, every trick and four mini hands in the summary. A deck that is 4 photos
  and 48 drawings looks mixed in Spades.

### B2. Options

| Option | What                                                                                   | Pros                      | Cons                                               |
| ------ | -------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| 1      | **Ask the rights holder for the other 48 faces** (same terms)                          | the real deck, consistent | depends on them; licence covers the app only       |
| 2      | Redraw the 12 court cards (J/Q/K) in-house in the deck's style; keep pips as stand-ins | ours, usable anywhere     | design time; must not copy their artwork           |
| 3      | Keep stand-ins, but polish them (court figures, gilt corner, texture)                  | quick, consistent         | photo 4 still stand out; maybe drop them in Spades |
| 4      | In Spades only, use stand-ins for **all** 52 (ignore the 4 photos)                     | a uniform hand today      | loses the real art there                           |

**Recommendation:** ask for the 48 now (Option 1); until they arrive, do Option 4 for Spades **only if** the mixed
hand looks wrong on a real phone (check first), and never substitute another suit's card (SOURCE.md rule).

### B3. Engineering when the art arrives

1. Files: `src/assets/themes/emerald-gilt/<rank>-<suit>.webp`, 600×840, WebP q≈75 (≈35 KB each, so the full deck
   is ≈1.8 MB, lazy per card, since a CSS background only downloads when a card shows it).
2. **Add a small size** for Spades (hand, trick, minis): 300×420 (≈10 KB). Spades shows up to 13 + 4 cards at
   46–72 px wide, so the 600 px files waste data on phones. Use a second token (`--art-card-…-sm`) or `image-set()`.
3. Fill the tokens in `styles/themes/emerald-gilt.css` (52 lines, `--art-card-<rank>-<suit>`); delete the matching
   stand-in rules or leave them as the fallback (the photo layer covers them).
4. **Preload** the 13 cards of my hand when a Spades deal starts (`new Image()`), so the flip-up never shows a
   stand-in first.
5. **QA**: the corner index of every photo must sit in the left 20% (the hand strip at 320 px is ~20 px wide); red
   vs black readable on the ivory; dark-mode edges; the card flip and reduced motion; the responsive spec
   (`e2e/spades-responsive.spec.ts`) in Emerald Gilt; the lint rule (no hex in components).
6. Update `SOURCE.md` (which cards, which licence) and `design/brand` if needed.

---

## Part C. What else is worth doing (my recommendations, in order)

**Must-do (things that may be broken for real players)**

1. **Is the new frontend live?** `play.vectanix.com/spades` showed the generic title. Find how the frontend deploys
   (CI on push, or a manual step) and confirm Spades, seat invites and the podium change are live.
2. **nginx SSE settings** for `/api/me/events` and `/api/spades/tables/*/events` (buffering off, 1-hour read
   timeout). Without them online Spades and invites stall or drop on production. The config is in neither repo.
3. **A real 4-phone game of Spades on production**, in all four themes; iPhone silent switch vs Web Audio; Android
   haptics. Everything so far ran in Playwright and jsdom only.

**Should-do**

4. **Performance budget is red** for every page (landing 165 KB vs 145; CSS 24.1 vs 22). Start with the shared chunk
   (Kachuful's store sits next to `persistence.ts` and the API client). Spades' own part is ~11 KB.
5. **Phone notifications** (Web Push; `pywebpush` already approved): "It's your turn", "X invited you to Spades".
   iPhone only in the installed PWA.
6. **Seat invites**: a host who reloads loses "can't make it" (needs a host-side read of sent invites); merge the two
   SSE readers (`sync/sse.ts` and Ishaara's).

**Polish and wow:** see **Part D** below, the full list of moments, specced and prioritised.

**Smaller loose ends** are all in `docs/codebase/TODO.md` (design audit follow-ups, Yerba Sun geometry, landscape
lock in the manifest, Spades' offline-ready toast, History paging for online tables).

---

---

## Part D. Wow moments: animations and features with good vibes

The goal: every game has a few moments people screenshot, shout about at the table, or send to the group chat.
Big, joyful, a bit cheeky, never in the way of play.

### D0. Rules every moment follows (from CLAUDE.md and the design system)

- **Motion:** animate `transform` and `opacity` only. Every moment has a reduced-motion version (a fade or a still
  frame) and follows the device setting; no in-app toggle.
- **Skippable and short:** a tap anywhere skips it. A moment never blocks the next action or delays a timed turn.
  The usual length is 1.2–2.5 s; only game-end moments may run longer.
- **Sound** respects each game's sound setting (Spades: Everyone's / Only mine / Off). **Haptics** use
  `hooks/useHaptics.ts` (`navigator.vibrate`: Android only; iPhone gets none, so a moment never relies on it).
- **Themes:** colours come from tokens only (gold = `--medal-gold*`, teams = `team-sun` / `team-moon`), so all four
  themes work. Check each moment in all four.
- **Bundle:** every celebration is a lazy chunk loaded when needed, and the budget is already red (§C4). Reuse what
  exists: `components/ui/Confetti.tsx` (canvas, already lazy), `ui/Podium.tsx` and `podiumReveal.ts`, `Counter`,
  `BidFlight`, Spades' `sound/sfx.ts` (Web Audio, no files) and `ui/fx.ts`.
- **No new dependency** without asking (no Lottie, no physics engine). Everything below is doable with Framer
  Motion and canvas.
- **Online games:** a moment that everyone should see is triggered by the server's frame (the same `rev`), so all
  phones play it together, never by one phone's clock.
- **Tests:** an e2e per moment with `test.use({ reducedMotion: 'no-preference' })` checks it appears and gets out of
  the way; a unit test checks the trigger rule (pure, in the domain).

### D1. The headline moments (the ones Jay picked)

**1. "Achievement unlocked" — one shared moment for every game** (`src/progression/Unlock.tsx`; needs Part A)

- **Look:** a playing card drops in from above, face down, then flips (rotateY) to show a gold-foil face with the
  achievement's emoji, name and one line. A light sheen sweeps across it (a gradient layer moved with `translateX`,
  like the leaderboard's first-place sheen). Gold sparks burst from behind it. After ~1.8 s it shrinks and flies into
  the player's avatar or the "Me" tab, which pulses with a +1 badge.
- **Several at once** stack like a dealt hand (a fan of up to 3 cards, "+2 more"); big ones (`big: true`) get the
  full-screen version with confetti, small ones a compact toast-sized card at the top.
- **Buzz and sound:** two short pulses (`vibrate([12, 40, 18])`) and a bright two-note chime.
- **Shame ones** (Wooden Spoon, Sandbagged, Trapped) flip to a **cracked, dull silver** face with a wobble and a
  "womp" sound. Funny, never mean.
- **Tap the card** → the achievement's page; long-press → share (a share image generated on canvas, our own
  artwork only, never the licensed deck art).
- **Reduced motion:** the card fades in already face up, no sparks, then fades out.

**2. Spades: the Boston celebration** (all 13 tricks to one team)

- When the 13th trick lands, the table dims, and all 13 trick piles slide from wherever they sit into one tall stack
  in front of the team, each with a soft click, accelerating. The stack glows in the team's colour, "BOSTON" slams in
  (scale 1.6 → 1 with a spring, like the SET stamp), and team-coloured confetti bursts from the stack. The partners'
  avatars do a small jump towards each other (a "high five").
- Online, it plays on all four phones from the hand-end frame; the losing team's phones get the same scene with a
  "You got Bostoned" caption.
- Also in the scorekeeper: when the scorer enters 13 tricks, a smaller version plays on the summary.
- **Trigger rule:** `teamTricks[t] === 13` (domain, already scored as such).

**3. Spades: the table cracks when spades are first broken**

- The first spade played on a non-spade lead (or the first spade lead after breaking) sends a **crack** across the
  felt: an SVG crack path that draws out from the played card (revealed with a moving mask, transform-only), a quick
  screen shake of 4 px (two cycles), a low "crunch", and the "♠ locked" chip on the table shatters into pieces that
  fall and fade. The crack then fades to a faint scar for the rest of the hand.
- Plays once per hand, on every phone (from the frame where `broken` flips to true).
- **Reduced motion:** the chip simply changes to "♠ broken"; no shake.

**4. Monthly season reveal on the podium** (every game; needs Part A's seasons)

- On the first visit after a season closes (the 1st of the month), the leaderboard opens as a **ceremony**: the
  screen darkens, "Season: November" types in, the steps rise 3rd → 2nd → 1st (the reveal in `podiumReveal.ts`
  already does this), a spotlight sweeps the podium before landing on the champion, a crown drops on the winner's
  avatar, confetti, and a "Season champion" banner. Then it settles into the normal board.
- Shown once per season per device (remembered in `persistence.ts`); a "Replay the reveal" button on the season page.
- The champion gets the season achievement (Part A), so the Unlock card plays right after for them.

**5. Kaali Teeri: the partner spotlight**

- When a called card is played, the table dims to ~30%, a spotlight cone (radial gradient) sweeps across the seats
  like a searchlight, slows, and lands on the partner. Their avatar lifts, a ring in the bidder's team colour snaps
  around it, and a caption "Arjun is with Riya!" types out. A drum-roll sound speeds up until the reveal.
- The **last** partner gets a bigger version ("The last partner is…"), since that's the table's biggest moment.
- Kaali Teeri is a scorekeeper, so this plays on the scoring device when the scorer marks who played the called card.

### D2. More ideas, by game (good vibes, a little crazy)

**Platform-wide (every game)**

| Idea                  | What it is                                                                                                                                                                                                    | Effort |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| **VS intro**          | When a game starts, the players slide in from the sides like a fighting-game VS screen, with their win rate and a "rivalry" tag if two of them are close head-to-head ("Riya 12–11 Arjun"). 1.5 s, skippable. |   M    |
| **MVP of the night**  | At game end, after the winner, one player gets a spotlight card for the stat they owned (best bid accuracy, most Nils, best clue), with a one-line caption.                                                   |   M    |
| **Roast lines**       | Funny, kind, stat-based captions on the winner screen and in the daily recap: "Dev bid 0 six times and still got set." A small pool of templates per game, never about anyone's name or looks.                |   S    |
| **Daily recap story** | The morning after a game night, Home shows a vertical, tap-through "story" (like Instagram stories): yesterday's winners, awards, best moment, MVP. Shareable as an image.                                    |   L    |
| **Avatar auras**      | Cosmetic rings earned through achievements: flames for a hot streak, a gold halo for a season champion, a frosty ring after a cold streak. Shown on every avatar for a week.                                  |   M    |
| **On-fire chip**      | A small animated flame next to a player who won 3 in a row this week, everywhere their avatar shows.                                                                                                          |   S    |
| **Emoji rain**        | In online games, a reaction sent by 3+ players within 2 s turns into an emoji rain on every phone.                                                                                                            |   S    |
| **Overtake moment**   | When you pass someone on the leaderboard, your row slides past theirs with a whoosh and "You passed Kabir".                                                                                                   |   S    |
| **App badge**         | The installed app's icon shows a number for pending invites and "your turn" (the Badging API; no notification needed).                                                                                        |   S    |
| **Shuffle refresh**   | Pull to refresh on History and boards shows a riffle-shuffle of three cards instead of a spinner.                                                                                                             |   S    |

**Kachuful**

| Idea                  | What it is                                                                                                   | Effort |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | :----: |
| **The hook moment**   | When the last bidder's forbidden number greys out, it cracks and swings like it's on a hook, with a "clink". |   S    |
| **Everyone made it**  | A round where every bid is made: fireworks from every avatar at once and "Clean round!".                     |   S    |
| **Grand slam**        | Already an achievement; give it the full-screen Unlock plus a slow-motion number count-up.                   |   S    |
| **Cold streak frost** | After 3 misses in a row, a player's row frosts over (an ice overlay fading in); one made bid shatters it.    |   M    |

**Spades** (beyond D1)

| Idea                   | What it is                                                                                                                                         | Effort |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| **Bag meter boom**     | When a team's bags hit 10, the bag meter overfills, pops, and a "−100" drops onto their score with a thud.                                         |   S    |
| **Blind Nil drama**    | When someone declares Blind Nil, their cards stay face down with a shimmering gold edge, and a heartbeat sound plays softly while they play.       |   S    |
| **Partner high-five**  | When a team makes its contract, partners can double-tap their partner's avatar; if both do within 2 s, a high-five animation plays on both phones. |   M    |
| **Last trick slow-mo** | When the hand's result depends on the last trick, it plays at half speed with a zoom on the table.                                                 |   M    |
| **Set shake**          | A set team's score bar shakes and cracks briefly when the SET stamp lands (the stamp exists).                                                      |   S    |
| **Rematch handshake**  | "Rematch" fills a progress ring as each player taps it; at four, the cards fly back into the deck and reshuffle.                                   |   M    |

**Kaali Teeri** (beyond D1)

| Idea               | What it is                                                                                              | Effort |
| ------------------ | ------------------------------------------------------------------------------------------------------- | :----: |
| **Gavel slam**     | When the auction ends, a gavel swings down on the winning bid with a "SOLD!" stamp.                     |   S    |
| **Suspense meter** | Before partners are known, a "Who's with the bidder?" bar shows how many called cards are still hidden. |   S    |
| **Thousand club**  | Reaching 1000 points: the score counts up in gold with a coin shower.                                   |   S    |

**Ishaara**

| Idea               | What it is                                                                                                                  | Effort |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | :----: |
| **Mind meld wave** | When a clue for 3+ is found in a row, a glowing line connects the found cards in order, then pulses.                        |   M    |
| **Trap glitch**    | Hitting the trap glitches the board: cards jitter (small translate steps), a red flash, and a static sound, then "TRAPPED". |   S    |
| **Thinking aura**  | While the clue-giver is typing, their avatar on the board breathes with a soft glow, so the table knows they're on it.      |   S    |
| **Photo finish**   | When both teams need one card, a countdown banner and a heartbeat play until a card turns.                                  |   S    |

### D3. Suggested order

1. **The shared Unlock card** (with Part A, since it needs achievements to fire). It's the most reused moment.
2. **Spades: Boston, the crack, the bag meter boom, Blind Nil drama.** All are small, live on the online table, and
   are the most visible in group play.
3. **The season reveal** (needs Part A's seasons).
4. **The Kaali Teeri partner spotlight and gavel slam.**
5. **Ishaara: trap glitch and mind meld.**
6. **Platform: VS intro, MVP, roast lines, overtake, emoji rain.**
7. **Bigger ones:** the daily recap story and avatar auras.

Every moment ships with its reduced-motion version, an e2e that runs with motion on, a check in all four themes, and
a line in `docs/codebase/DESIGN-SYSTEM.md` (Motion) so the next game reuses it.

### D4. Progression and cosmetics: frames, pets, titles, a shop (thinking out loud, to decide together)

Jay's idea (2026-11-16): play earns things you can show off, like Snapchat's streaks and Bitmojis or Among Us skins
and pets. Reach X points and frames unlock; pets; maybe avatars; something special for whoever is #1 on the
leaderboard; maybe a shop. Nothing here is decided. This section is the menu and the trade-offs, for a real
discussion before any of it is built. Avatar auras and the on-fire chip (D2) fold into this.

**Why it fits Baithak.** The same friends play every week. Cosmetics give them something to chase between game nights,
make every avatar on every screen a little story ("he's had the crown for three weeks"), and reward showing up, not
just winning. It works because the group is small and private: it's status among friends, not strangers.

#### What could unlock (the catalogue)

| Kind                        | What it is                                                                                                                                                                                                                                    | Where it shows                      | Cost to build |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | :-----------: |
| **Frames**                  | Rings around the avatar: gilt, neon, flames, frost, petals, a rotating card suit, animated ones at higher tiers.                                                                                                                              | Every avatar, every game            |       S       |
| **Titles**                  | A line under your name: "The Nil Queen", "Sandbagger", "Mind Reader", "Hook Survivor". Earned from achievements, picked by you.                                                                                                               | Player pages, podium, lobby chairs  |       S       |
| **Badges**                  | Pick up to 3 achievements to pin on your profile.                                                                                                                                                                                             | Player pages                        |       S       |
| **Pets**                    | A small companion beside your avatar: a cat, a parrot, a tiny elephant, a chai cup with eyes. It reacts: cheers when you win a trick, sulks when you're set, naps when you're idle. Levels up and grows with play (Tamagotchi-light).         | Your seat at the table, player page |      M–L      |
| **Victory effects**         | What plays when you win: confetti style, a fireworks colour, a mic-drop, a crown drop.                                                                                                                                                        | Winner screens, podium              |       M       |
| **Trick and table effects** | Spades: a trail on the card you play, a sweep style when you win a trick. Our own art only.                                                                                                                                                   | Online table                        |       M       |
| **Emotes / reactions**      | Extra reaction packs for online games (animated emoji, a "GG", a "😤").                                                                                                                                                                       | Online games                        |       S       |
| **Card backs**              | Our own designs only (never the licensed Emerald Gilt deck art, whose licence is narrow, Part B).                                                                                                                                             | Your hand and dealt cards           |       M       |
| **Avatar builder**          | A layered 2D avatar (face, hair, glasses, hat, outfit as SVG layers), like a light Bitmoji or Memoji.                                                                                                                                         | Everywhere                          |       L       |
| **3D avatars**              | Real 3D (three.js or Ready Player Me). **Not recommended now:** a new dependency, a big bundle, battery, and a third-party service seeing player data. A 2.5D look (layered SVG with parallax on tilt) gets most of the feel for little cost. | –                                   |      XL       |

#### How you'd earn things (pick a mix)

- **Levels (XP):** every game gives XP (play a game, make a bid, win, finish an online game). Levels unlock frames and
  pet stages on a set path ("Level 5: Gilt frame"). Simple, everyone progresses, rewards turning up.
- **Achievements:** each achievement can carry a reward (Boston → "Boston" title; 10 Nils → the "Ice" frame).
  Reuses Part A directly.
- **The crown (being #1):** whoever is #1 on a game's leaderboard this month wears a **crown frame** while they hold
  it, everywhere, live. Lose the spot, lose the crown. The season champion keeps a **permanent dated trophy**
  ("Spades champion · Nov 2026").
- **The belt (head-to-head):** a title belt per game that moves only when someone beats the current holder in a
  game they both played. Instant rivalry stories ("Arjun has held the Kachuful belt for 9 games"). Very Gen Z.
- **Play streaks (Snapchat-style):** play on N days in a row (or N weeks in a row with the same crew) and a flame with
  the count shows by your name; miss one and it resets. Friend streaks: "🔥 12 with Riya".
- **Seasons pass (free only):** each month a free track of 10 rewards earned by XP. No paid track.

#### A shop?

- **Possible, with a soft currency only:** "chips" earned by playing, spent on cosmetics. A shop gives choice ("I want
  the parrot, not the frame") and something to save for.
- **Recommend against real money**, at least now. It needs payments, refunds, tax and app-store rules; it changes a
  private friends' app into a product; and in India real-money online gaming is now heavily restricted by law, so
  anything that smells of paying in a card game is a risk to avoid. Cosmetics bought with real money are legal in
  principle but not worth it here.
- **Never:** loot boxes, gacha, random paid rewards, pay-to-win, or anything that affects a game's rules or scores.
  Everything is cosmetic, and a shop item always says exactly what you get.
- **Never** dark patterns: no fake countdowns, no "only 2 left", no guilt nags. Streak reminders, if any, are opt-in.

#### Making it fair (scorekeeper games are typed in by hand)

- Kachuful, Kaali Teeri and Spades' scorekeeper are **self-reported**: anyone can type a fake game to farm XP.
  Ishaara and online Spades are **server-run**, so they're trustworthy.
- So: XP and chips are computed **on the server only**, from synced games (signed out, nothing is earned).
- Rare items (the crown, the belt, season trophies, top pet stages) come only from **server-run games** or from
  boards that already apply minimum-games rules.
- Scorekeeper games earn ordinary XP with a **daily cap**, and only count when the game has 3+ different registry
  players and some rounds.
- The admin page gets a way to revoke an unlock and void a game (rare, but needed).

#### How it would be built (when we get there)

- **Data (backend, one migration):**
  - `xp_ledger(player_id, game_kind, game_id, reason, amount, at)`: append-only, so a balance is always a sum and can
    be recomputed;
  - `unlocks(player_id, item, source, at)`;
  - `equipped(player_id, slot, item)` for the frame, title, pet and effects slots;
  - `wallet` derived from the ledger, never stored.
- **The catalogue lives in code**, like achievements (`src/progression/items.ts` mirrored in Python), each item with a
  rule (level N, achievement X, crown, belt, shop price).
- **Recomputed by the same engine** as achievements after each game write, so a rule change or a voided game
  corrects everything.
- **One place to draw it:** frames and pets go into `components/ui/Avatar.tsx` (used in 71 files), so every game gets
  them at once. Two rules there:
  - every animated frame or pet is transform and opacity only, with a static reduced-motion version;
  - frames load lazily, and an avatar never blocks on its decoration.
- **Profiles and the server:** what you've equipped travels with the player record (the appearance API already
  exists: `app/api/appearance`), so other phones see your frame and pet.
- **UI:**
  - a **Locker** page on Me (owned items, equip slots, preview on your avatar at the table);
  - a **Shop** tab if we do one;
  - the **Unlock card** from D1 plays for every new item, and level-ups get a short "Level 7!" burst.

#### Suggested phasing

| Step | What                                                           | Why first                             |
| ---- | -------------------------------------------------------------- | ------------------------------------- |
| C1   | XP, levels and 6–8 **frames** + **titles** from achievements   | cheapest; shows on every avatar       |
| C2   | **The crown** for #1 and **season trophies**                   | the status everyone sees              |
| C3   | **Play streaks** and friend streaks                            | brings people back weekly             |
| C4   | **The belt** per game                                          | rivalry stories                       |
| C5   | **Pets** (4–6, three growth stages, reactions at the table)    | the most delight, more art work       |
| C6   | **Chips and a shop** (earn-only), victory and trick effects    | once there are enough items to choose |
| C7   | **Avatar builder** (layered 2D); 3D only if ever really wanted | biggest art and UI cost               |

#### Questions to settle together

- Levels and XP, achievements as unlocks, or both?
- The crown and the belt: yes? Per game, or one overall "Baithak" crown?
- Pets: which animals or objects fit the Baithak vibe (desi touches: a chai cup, a parrot, a tiny elephant)?
- A shop with earn-only chips: yes, later, or never?
- Who makes the art: in-house SVG in the design kit (`design/brand`), or commissioned?
- Play streaks: daily, weekly, or per crew?

---

## Questions for Jay before starting

1. Part A: one shared kit + `game_kind` column (recommended), or quick per-game copies?
2. Approve or edit the draft catalogues in A5 (and keep the "shame" ones?).
3. Daily awards and seasons for every game too, or achievements first?
4. Part B: will you ask the deck's rights holder for the other 48 faces? Until then, keep the mixed deck in Spades or
   use stand-ins for all 52 there?
5. Part D: which moments first (D3 is my order), and are roast lines and "shame" achievements in or out?
6. Part D4: cosmetics and progression (frames, titles, crown, belt, streaks, pets, a shop?): the questions at the end
   of D4.
7. ~~Should this plan be committed?~~ Answered: Jay asked to commit it on its own branch (`docs/next-session-plan`), so
   another laptop has it. Delete it (and the branch) once the work is done.

## Session start checklist

```sh
cd ~/workspace/personal/web-kachuful-scorekeeper && git pull && npm ci && npm run typecheck
cd ~/workspace/personal/backend-kachuful-scorekeeper && git pull && make verify   # ~4 min
curl -s https://play.vectanix.com/api/health                                         # version = backend main
```

Then read this file, `docs/codebase/TODO.md` and `docs/codebase/ARCHITECTURE.md`, and answer the questions above.
