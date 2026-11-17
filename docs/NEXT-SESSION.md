# Next session: where we left off (2026-11-17, 19:00 IST)

Read this first, then `docs/ACHIEVEMENTS-PLAN.md` and `docs/WOW-MOMENTS-PLAN.md` (both approved). These working docs,
`backend-requests.md` and `motion-preview.html` are committed on the feature branch **only so another session or laptop
has them**. **Delete all of them before merging to `main`** (CLAUDE.md: working docs are never committed to main).

Start a session with: "Read docs/NEXT-SESSION.md and continue."

---

## 1. Where things stand

| Track                                                               | State                                                                                                                                                               | Overall |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: |
| **Achievements and awards for every game** (`ACHIEVEMENTS-PLAN.md`) | P0–P2 done and reviewed. P3 Spades, P4 Kaali Teeri, P5 Ishaara built in both repos, checked by their agents (§3), **not yet reviewed by the coordinator or merged** |    ~80% |
| **Wow moments** (`WOW-MOMENTS-PLAN.md`)                             | Plan and `motion-preview.html` approved (with Jay's two changes, §9). M0 foundations about two thirds done (§4)                                                     |    ~10% |
| Part C must-dos (old plan)                                          | Frontend deploy confirmed live; nginx is fine for live streams; HTTP/2 enabled on the server                                                                        |  2 of 3 |

Nothing is on `main` yet. Production still runs `main` (frontend `3fe89e0`, backend `413fbd0`). Every branch below is
pushed to GitHub and clean.

## 2. Branches

Same names in both repos. Each `feat/ach-<game>` branched from `feat/achievements-every-game` and must be merged back.

| Branch                             | Frontend (`web-kachuful-scorekeeper`)         | Backend (`backend-kachuful-scorekeeper`)                                  |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `feat/achievements-every-game`     | P1 kit (9 commits) + these docs               | P2 engine (8 commits; `ce601cc`: the feed never shows a Spades join code) |
| `feat/ach-spades`                  | 4 commits, head `3661f38`                     | 3 commits, head `f1b0ca1`                                                 |
| `feat/ach-kt`                      | 8 commits, head `b096ebd`                     | 4 commits, head `d2cd5fe`                                                 |
| `feat/ach-ishaara`                 | 8 commits, head `59f11c4` (incl. an e2e spec) | 3 commits, head `99bae42`                                                 |
| `feat/wow-moments` (frontend only) | 11 commits, head `6b483c8` (M0 so far)        | —                                                                         |

On this laptop they are worktrees in `~/projects/PR/wt/` (`web-<game>`, `backend-<game>`, `web-wow`); each game's
backend tests used their own database (`kachuful_test_spades`, `_kt`, `_ishaara` in the Docker Postgres, which had to
be restarted once with `docker start backend-kachuful-scorekeeper-db-1`), and e2e its own `E2E_PORT` (4174–4177). On
another laptop just check out the branches.

## 3. Achievements: what's left, in order

**What each game agent verified** (typecheck, lint, build, full vitest with only load timeouts that pass alone;
backend ruff, format, mypy and targeted pytest; golden parity TS ↔ Python matched first time):

| Game        | Still missing                                                                  | Notes                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spades      | **e2e spec** (score a Boston → pop → Awards/Achievements); `perf:budget` after | A Spades scorekeeper `flow.test.tsx` was slow once under load (passes alone; check it isn't slower because of the pops). Online pop says "Someone" for a player who has left. Recompute CLI not run itself  |
| Kaali Teeri | **e2e spec**                                                                   | The final hand of a game doesn't pop (its moments show in the winner reel). Season rows not yet ranked: the app orders them by games, the server by rate (golden test ignores order; fix in the shared kit) |
| Ishaara     | —                                                                              | An "Overtime" pop stays if the guess that ended the turn is undone (server rows correct). The Win reel shows 12 cards, so turn moments can fall off with 6 players                                          |
| All         | first-load +0.3–0.6 KB on the large screen                                     | The shared `AchievementReel` and `progression/catalogue` now split out of Kachuful's `howWon` chunk (same code, 2 more files). Fix: a chunk group in `vite.config.ts`                                       |
| All         | mock API                                                                       | Mock feeds carry achievement items only (no `game_finished` items); mock Kaali Teeri and Spades uploads still return `earned: []` (the real backend returns rows)                                           |
| All         | big moments                                                                    | They pop as cards like the rest; the full-screen version is wow-moments M1 (the unlock card)                                                                                                                |

Every interpretation the agents made where the plan left room is listed in their commit messages and below in §6.

Then:

1. **Review** each game branch against the plan's catalogue (§3 Spades, §4 Kaali Teeri, §5 Ishaara) and the
   interpretations in §6. Write the two missing e2e specs.
2. **Merge** `feat/ach-spades`, `feat/ach-kt`, `feat/ach-ishaara` into `feat/achievements-every-game` in both repos.
   Expected conflicts: backend `tests/fixtures/VERSION.md` (keep every paragraph), `tests/test_indexes.py`, and
   possibly `tools/mock-api/progression/index.ts` and the Kachuful fixture exporter's excluded prefixes (each game added
   its own).
3. **Full checks** on the merged branch: backend `make verify` (about 19 min under load; known local-only failures: the
   backup tests, since local `pg_dump` is 14 vs server 16 and one test hard-codes `kachuful_test`); frontend
   `npm run test:e2e`, rerunning failures with `npx playwright test --last-failed --workers=1`; `npm run perf:budget`.
4. **P6:** an Activity feed for every game (`?game=all`) on the Me page with each game's achievement count; the
   `vite.config.ts` chunk group; docs: `docs/codebase/ARCHITECTURE.md` (the progression kit, registry, `src/fx`, the
   `baithak.fx` key) and `docs/codebase/TODO.md` (remove the nginx/SSE and "is the frontend live" items, now done; add
   every follow-up in the table above that isn't fixed).
5. **P7, ship:** delete the working docs, merge to `main` in both repos, push (pushing `main` deploys both; the backend
   deploy runs migrations, so 0022 applies itself). Then on the server, from the backend's current release directory:
   ```sh
   .venv/bin/python -m app.cli recompute-achievements --game spades      # then kaali-teeri, ishaara
   .venv/bin/python -m app.cli close-day --since 2026-09-01              # past days, every game
   .venv/bin/python -m app.cli close-season --since 2026-09              # past months, every game
   ```
   (pick the `--since` dates from the oldest game of each kind).

## 4. Wow moments: what's left

M0 on `feat/wow-moments` has:

- **Sound:** sounds moved to `src/fx/sound.ts` (Spades re-exports them). `cue(name, tier)` plays the seven new sounds, each with a tier, under the platform setting.
- **The "Sounds and vibration" setting** on the Me page (`src/platform/pages/FxSettings.tsx`, key `baithak.fx`, default Big moments and vibration on).
- **Vibration patterns** (`vibrate([12,40,18])`).
- **WAAPI helpers** moved to `src/fx/waapi.ts`.
- **Tokens:** `TRAVEL` and the moment timings in `components/ui/motion.ts`.
- **Stamp and sheen** in `src/fx/stamp.ts`.
- **The reduced-motion fix** ("♠ Spades broken" and the bag "−100" now readable).
- **The moment queue** in `src/fx/moments.tsx`:
  - one Moment at a time, by priority
  - two Moments per scope; a game end is never capped
  - each id plays once
  - a skip layer, plus Escape
  - 10 tests

Still to do in M0:

- the moments lab (`/?lab=moments`, dev only, with a way to register moments)
- `.mat-toast` in the low-end and reduced-transparency resets
- Confetti's own reduced-motion guard
- StreakCelebration's particles on WAAPI, with a static shadow and the bob stopping after two cycles
- `Counter`'s `swell: 'scale'` option
- `perf:budget`, plus the themes, account and Spades-online e2e specs

Not yet seen or heard in a browser: the stamp, the sheen, the sounds.

Then **rebase `feat/wow-moments` onto the merged `feat/achievements-every-game`** and build M1–M7:

- M1: the unlock card, replacing the per-game pops' big moments.
- The podium reveal on every podium, in ceremony and board lengths.
- The Spades, Kaali Teeri and Ishaara moments, as three parallel agents.
- The perf fixes, such as the 250ms re-render.
- The docs.

Decisions already made (plan §9): sounds default to Big moments; count-ups keep the weight swell on hero numbers and use
a scale swell on rows; roast lines are out.

## 5. Housekeeping

- Old branches left untouched (ask before deleting): frontend `feat/port`, `feat/responsive`,
  `wip/motion-winner-turn`, `docs/next-session-plan` (the older plan, superseded by these docs), and three stale agent
  worktrees under `.claude/worktrees/` (Kaali Teeri WIP from 2026-11-09).
- After merging: `git worktree remove` each `~/projects/PR/wt/*`, drop the test databases
  (`docker exec backend-kachuful-scorekeeper-db-1 psql -U kachuful -d postgres -c "DROP DATABASE kachuful_test_spades"`,
  then `_kt`, `_ishaara`), and delete the merged `feat/ach-*` branches locally and on GitHub.
- Server: `~/play-nginx.bak` is the nginx backup from before HTTP/2 (delete once you're happy).
- Only you can do: a real 4-phone Spades game in all four themes (Part C #3).

## 6. Interpretations the game agents made (review these)

**Spades:**

- **Earning basics:**
  - Cancelled games earn nothing; a game in progress earns hand moments but no game codes.
  - `ice_cold` is for a non-blind Nil only.
  - `double_nil` needs both partners to make it.
  - `nil_breaker` goes to both opponents, once per hand.
  - `bang_on` is spoiled by bags, including a partner's failed Nil.
- **The online-only codes:**
  - `last_gasp`: the team's non-Nil bidders had taken contract − 1 tricks after 12 and win the 13th.
  - `deuce_ace`: a trick led in a non-spade suit, won by your 2♠, with that suit's Ace in it.
  - The three online-only codes need 13 recorded tricks.
- **Game codes:** every win code needs the team to win; a draw isn't a win. `bag_collector`, `marathon` and `night_owl` count win or lose. Margins use the final scores.
- **Careers and replaced seats:** careers come from finished games' board rows. The hands, made and nils ladders count replaced seats; streaks, games and crew use who sat at the end.
- **Awards:**
  - The daily awards count games that finished that day.
  - `day_boston` goes to every player with a Boston, valued by how many.
  - `season_pair` needs 6 games together and a rate above 0.
  - `season_iron` is among ranked players only.
- **Winner reel:** shows careers and level-ups only when signed out on the scorekeeper.

**Kaali Teeri:**

- **Careers:** the hand-counted careers (hands, bids made, partner wins, bid streaks, Partners in Crime) count every done hand, finished game or not. Wins, games and crew count finished games only.
- **Streaks:** `streak_N` is earned each time a run reaches N.
- **Partners in Crime:** at most one per hand per player.
- **Comeback and wire to wire:** `comeback` needs someone ahead at that hand; `wire_to_wire` counts a tie for the lead.
- **Bid of the Day and Overcooked:** ties share, each player credited at their earliest such hand.
- **Season awards:**
  - Sharpest, Kingmaker and Iron go to ranked players only.
  - Sharpest needs a made rate above 0.

**Ishaara:**

- **Names:** sentence case, like the rest of the app; the 🙃 tag comes from the `shame` flag.
- **Fastest Win (`day_speed`):** counts all-found wins only, from the first clue to the finish, shown as m:ss.
- **Clue-giver awards:** `day_giver` and `season_giver` need a rate above 0.
- **Own goal:** the last guess revealed the other team's last card.
- **Comeback and photo finish:**
  - Replay the cards left after each guess or penalty reveal.
  - Resign wins aren't excluded; only `flawless` excludes them.
- **Speedrun:** an all-found win in 4 or fewer of the team's clues, own-goal wins included.
- **Turn index:** the clue's position among all of the game's clues.
- **Live pops:** name the team ("Sun · Mind meld"), and only for turns that end after the board opened.
