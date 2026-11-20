# Next session: the Rewards plan, from about 23%

Handoff written 2026-11-20 to carry on from another laptop. A working doc: delete it with `REWARDS-PLAN.md` and
`backend-requests.md` before `feat/rewards` merges into `main`. (Committed on the branch at Jay's request, so the work
can move between laptops; that's the only reason it's in git.)

## Prompt to start the next session

> Read `docs/NEXT-SESSION-REWARDS.md`, then `docs/REWARDS-PLAN.md` (§6.7 and §16 especially), `backend-requests.md`
> and the "Rewards" section of `docs/codebase/TODO.md`. We're on branch `feat/rewards` in both repos. Carry on with the
> plan from "Next, in order" below; report the overall % after each step. Ask me before the art (G0's style sheet).

## Setup on the new laptop

```sh
# both repos, same parent folder
cd web-kachuful-scorekeeper && git fetch && git checkout feat/rewards && npm ci
cd ../backend-kachuful-scorekeeper && git fetch && git checkout feat/rewards && uv sync && make migrate
```

No new dependency and no new migration on either side.

## Where we are (about 23% of the plan)

Weights from the plan (§16): G0 5, G1 20, G2 25, G3 15, G4 20, G5 10, G6 5.

- **G0 (≈3 of 5):** decisions taken (below), `backend-requests.md` started. **Not done:** the art style sheet for Jay
  (1 bust, 2 outfits, 2 headwear, 1 frame at 26/32/52/72/220px, all 4 themes).
- **G1 (≈6 of 20):** avatar moods on the round summary (✨ smug leader, ☁️ lone last place, CSS glyph); faces on the
  Spades scorekeeper's Tricks and Summary and Ishaara's clue card; the moment budget's downgrade, per-game cap and
  three crown shows a night. **Not done:** `AvatarFill` tiers and the stage bust (needs art), Ishaara's clue phone and
  Win faces, `pauseUntil`, the per-round cap of 1 and the cooldown (§13).
- **G2 (≈14 of 25), Kachuful only:**
  - **Medals:** 🥇 Badshah, 🥈 Wazir, 🥉 Senapati from this month's season standings (points per round, >50 rounds); last
    month's top 3 "defending" until 3 qualify. Metal names everywhere at the table, a metal ring on the seat.
  - **The Kursi:** taken by finishing above its holder; seat badge, deal line, banter, "Kursi chheeni!".
  - **Aaj ka Sitara ⭐** (tonight's leader from the night's 2nd game) and **Legend 🏛️** (most season titles, ≥2).
  - **Banter:** one line a round on the summary about the holders (gold first, then Kursi, Sitara, Legend; Wazir passing
    the Badshah); "Table banter" switch on the Me page (`baithak.fx` `banter`).
  - **The chase:** a crack on a slipping medal, "On track for 🥇", "🪑 ke kareeb".
  - **End of game:** "Naya Badshah!" and "Kursi chheeni!" on one card (a queued Moment, skippable); a line for a new
    Wazir/Senapati, a defended seat or Kursi, tonight's new Sitara.
  - **Round 1's deal:** the medallists ("Badshah Riya table pe hai", or "vs"), the Kursi line, else a rivalry or a
    milestone (table intel).
  - **Tonight's Wrapped:** the night (gaps ≤3h) as story cards, on the table device, linked from the winner screen.
  - **Not done:** the night's Wrapped on everyone's own phone (server `nights` + `close-nights` job), stat crowns live,
    bounties, `crowns` table and `status.changes` (feed items, "held N days"), the live page, the other three games.
- **G3–G6:** not started.

## Decisions taken (Jay said "if the plan looks solid, start"; recommended answers used)

1 seat token everywhere + a stage bust at big moments · 3 build the Kursi now, named "Kursi" · 13 friendly roast ·
14 last month's top 3 defend until 3 qualify · 15 signed out, medals from the device's archive · 16 Wazir and Senapati.
Also: a shared Kursi stays while its best-placed holder at the table is unbeaten.

## Where the code is

| What              | Where                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure rules        | `src/games/kachuful/domain/{medals,banter,stars,kursi,night}.ts`; `src/progression/{kursi,intel}.ts` (game-agnostic)                                                          |
| The table's state | `src/games/kachuful/state/medals.tsx` (`MedalsProvider`, `tableMedals`, `NO_MEDALS`, `MedalsValue` for tests)                                                                 |
| UI                | `components/ui/{MedalName,AvatarState}.tsx`; `games/kachuful/components/{SeatName,GameTable,BanterLine,MedalTakeover,NightLink,StoryDeck}.tsx`; `screens/pages/NightPage.tsx` |
| Strings           | `src/strings/{medals,kursi}.ts`, `src/strings/fx.ts` (banter switch), `src/games/kachuful/strings/{banter,night}.ts`                                                          |
| Tokens            | `--silver-tx`, `--bronze-tx` (themes.css and each theme file; contrast tests)                                                                                                 |
| Moments           | `src/fx/moments.tsx`: `downgrade`, `game` + `perGame`, `takeCrownShow`                                                                                                        |
| Server            | `GET /api/medals` (+ `today`), `GET /api/kursi`, `GET /api/places`; `app/domain/kursi.py`; `tests/api/test_medals.py`, `tests/domain/test_kursi_golden.py`                    |
| Fixtures          | `contract/fixtures/kursi-cases.json` (`src/progression/kursi.export.test.ts`); copied to the backend                                                                          |
| Mock API          | `tools/mock-api/server.ts`: medals, kursi, places                                                                                                                             |
| E2E               | `e2e/medals.spec.ts`; `seedArchive` in `e2e/fixtures.ts` puts finished games in IndexedDB                                                                                     |

## Gotchas learned

- Under reduced motion the shells clear `state.fresh` at once; a show that must still play keeps `fresh` as the
  screen opened (`useMedalTakeover`).
- Decorative glyphs on rows go in CSS (`.mood-glyph::after`), or e2e that read row text break.
- On a 390×844 phone the summary hides its mini table, so seat badges there are attached but not visible.
- `getByRole('button', { name: 'Next' })` also matches "Tap for the next card": use `exact: true`.
- `npm run test:e2e` was **not** run in full on this branch; the related specs pass. Run it before merging.

## Next, in order

1. **G3 Sikke** (no art): ledger, earn rules (§9), backfill, levels, wallet chip and ledger sheet, "+🪙" on the winner
   screen; bounties start paying. Server-decided in the game write's transaction, append-only, recompute-safe. Write
   it into `backend-requests.md` first.
2. **G2's server half:** `crowns` + `status.changes` in upload responses, `nights` + `close-nights` (Wrapped on every
   phone), stat crowns live.
3. **G0 art style sheet** for Jay's approval, then G1's stage bust and G4's Wardrobe.
4. G5 (Bazaar, gifts, hidden achievements, firsts), then the other games, then G6 (full e2e, `perf:budget`, 4-theme
   check, docs, delete working docs, merge).

Not checked anywhere: a real phone, motion on frame by frame, a real night with the group (plan §17).
