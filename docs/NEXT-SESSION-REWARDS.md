# Next session: the Rewards plan, from about 37%

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

## Where we are (about 37% of the plan, 2026-11-20)

Weights from the plan (§16): G0 5, G1 20, G2 25, G3 15, G4 20, G5 10, G6 5.

- **G0 (≈3 of 5):** decisions taken. **Not done:** the art style sheet for Jay.
- **G1 (≈10 of 20):** moods, faces everywhere (Spades scorekeeper, Ishaara board, clue phone, win screen), the moment
  budget's downgrade, per-game cap, nightly crown cap, and now holding Moments during input (`useHoldMoments`) and a
  per-scope `cap` / `kind`+`round` cooldown in the queue (no caller uses those two yet). **Not done:** `AvatarFill`
  tiers and the stage bust (needs art), one round scope for the scorekeepers' Moments.
- **G2 (≈14 of 25), Kachuful only:** medals, Kursi, Sitara, Legend, banter, chase, takeover, table intel, Tonight's
  Wrapped on the table device. **Not done:** `backend-requests.md` §6 (crowns, `status.changes`) and §7 (nights),
  written but not built; stat crowns live, bounties, the live page, the other games.
- **G3 (≈10 of 15):** Sikke built in both repos (`backend-requests.md` §5). App: `src/progression/sikke.ts`,
  `components/sikke/{Wallet,GameSikke}.tsx`, wallet on Me and the player page, "+🪙" on every winner screen, `coin` and
  `ghungroo` sounds. Backend: `sikke_entries`, `app/services/sikke.py`, three routes, `recompute-sikke [--dry-run]`.
  **Not done:** prices and levels checked against real history (run `recompute-sikke --dry-run` on production),
  `make perf` with Sikke (a finishing Kachuful PUT now rebuilds the Kursi chain), bounties and Sitara pay (need §6/§7).
- **G4–G6:** not started.

**Checks:** app typecheck, lint, all unit tests pass; e2e run only for `sikke`, `medals`, `me-every-game` (full suite
not run). Backend `make verify`: everything passes except the backup test (this machine's `pg_dump` is 14, the server
16) and one Spades timeout test that errors only under the full run (passes alone).

**Deploy (backend):** `alembic upgrade head` (0023), `python -m app.cli recompute-sikke --dry-run`, then without
`--dry-run` once.

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

1. **G2's server half:** build `backend-requests.md` §6 (crowns, `status.changes`) and §7 (nights, `close-nights`),
   then the app: the takeover from `status.changes` on every phone, Wrapped from the server, bounties paying.
2. `make perf` on the load dataset (Sikke's Kursi rebuild on the PUT); the Sikke dry run on production data, then
   tune `LEVELS` and the prices in `src/progression/sikke.ts` (re-export the fixture, copy it to the backend).
3. **G0 art style sheet** for Jay's approval, then G1's stage bust and G4's Wardrobe.
4. G5 (Bazaar, gifts, hidden achievements, firsts), then the other games, then G6 (full e2e, `perf:budget`, 4-theme
   check, docs, delete `REWARDS-PLAN.md`, this file and `backend-requests.md`, merge).

Not checked anywhere: a real phone, motion on frame by frame, a real night with the group (plan §17).
