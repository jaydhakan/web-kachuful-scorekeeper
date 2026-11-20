# Next session: the Rewards plan, from about 57% (about 76% of what's in scope now)

Handoff written 2026-11-20 (second session of the day) to carry on from another laptop. A working doc: delete it with
`REWARDS-PLAN.md` and `backend-requests.md` before `feat/rewards` merges into `main`. (Committed on the branch at Jay's
request, so the work can move between laptops; that's the only reason it's in git.)

## Prompt to start the next session

> Read `docs/NEXT-SESSION-REWARDS.md`, then `docs/REWARDS-PLAN.md` (§6, §7, §13 and §16 especially),
> `backend-requests.md` and the "Rewards" section of `docs/codebase/TODO.md`. We're on branch `feat/rewards` in both
> repos. Carry on from "Next, in order" below; report the overall % after each step. Wardrobe and Bazaar are out of
> scope for now. Test everything, phones first (390×844, 360×640/740), then tablet and laptop.

## Setup on the new laptop

```sh
# both repos, same parent folder
cd web-kachuful-scorekeeper && git fetch && git checkout feat/rewards && npm ci
cd ../backend-kachuful-scorekeeper && git fetch && git checkout feat/rewards && uv sync && make migrate
```

No new dependency. Two new backend migrations: 0024 (crowns) and 0025 (nights).

## Scope (Jay, 2026-11-20)

"No need to focus on Wardrobe and Bazaar for now; other than that finish everything and test everything completely so
that it works clean and fine on mobile first, then laptop, tablet." So G4 (Wardrobe) and G5's Bazaar and gifts are out.

## Where we are

Weights from the plan (§16): G0 5, G1 20, G2 25, G3 15, G4 20, G5 10, G6 5. Done ≈ 57 of 100; in scope (without G4
and the Bazaar, ≈ 75) that's ≈ 76%.

- **G0 (≈3 of 5):** decisions taken. **Not done:** the art style sheet (only needed for the stage bust now).
- **G1 (≈14 of 20):** moods, faces, the whole moment budget (§13): holds during input, one big unlock card a
  scorekeeper round (Kachuful, Kaali Teeri, Spades) with a 2-round cooldown per achievement, a capped card drops in
  small (was lost before), per-game and nightly crown caps. **Not done:** `AvatarFill` tiers and the stage bust (art).
- **G2 (≈22 of 25), Kachuful:** medals, Kursi, Sitara, Legend, banter, chase, takeover, intel, and now the server half:
  `crowns`/`crown_reigns`, `status` on the Kachuful PUT and the user stream, bounties (40, once per challenger per
  holder per week), `nights` with `close-nights`, Sitara pay (30). App: crown news banner on the other phones
  (`components/crowns/CrownNews.tsx`), bounty chips on the winner screen, crown and night feed rows, round 1's "Beat
  Riya: +40 🪙", the night's Wrapped from the server (`NightPage` with an id, Your nights, End the night, "Your night is
  ready" on Me and the landing page), "Tonight so far" on the winner screen, stat crowns on Kachuful's player page,
  medals and the Kursi on the live page (signed-in spectators). **Not done:** the other games' crowns (the plan waits
  for a real night with Kachuful first), banter on the live page, signed-out spectators' medals (needs a public read).
- **G3 (≈13 of 15):** Sikke in both repos, plus bounty and Sitara pay. **Not done:** `make perf` (the dev DB was empty;
  `make load` takes ~10 min), the Sikke dry run on production data and tuning `LEVELS`/prices.
- **G4:** out of scope.
- **G5 (≈4 of 10):** hidden achievements (`hidden` on `AchievementDef`, "???" until anyone earns one: Kachuful
  dealers_revenge/zero_hero, Spades deuce_ace/one_man_band, Kaali Teeri brick_wall/lone_wolf, Ishaara one_word_four),
  festival effects at Kachuful's round 1 deal (`src/fx/festival.ts`, `fx/ui/FestivalTable.tsx`). **Not done:** firsts
  and group milestones (server: a new backend request), Bazaar/gifts (out of scope).
- **G6 (≈1 of 5):** see Checks.

## Checks (2026-11-20)

- App: typecheck, lint, all 2385 unit tests pass.
- Full `npm run test:e2e` (331): 315 passed first time with the machine loaded (the backend suite was running too);
  of the 15 failures, 11 passed alone (load timeouts) and 4 were real and are fixed: Kaali Teeri's achievements spec
  (now one big card a hand), the Ishaara board's announcer locator (the crown news live region), and Ishaara's key
  screen scrolling at 360×640 (the clue-giver's face in the key header; it stays on the gate screen only). Re-run the
  full suite on a quiet machine before merging.
- Backend `make verify`: 1430 passed; the backup test fails (local `pg_dump` 14 vs server 16), and two Spades/Ishaara
  live tests time out only under the full run (pass alone).
- **The app has not been run against the real backend's §6/§7 yet**, only the mock API. The shapes were compared by
  hand and one mismatch fixed (a night feed item's `games` is a list of ids).

## Backend deploy (when merging)

`alembic upgrade head` (0024, 0025), then once: `recompute-crowns`, `close-nights --all`, `recompute-sikke` (it now
also pays bounties and Sitaras; run with `--dry-run` first). Add a systemd timer for `close-nights` every 30 min beside
`close-day` (no units in the repo). Backend `CLAUDE.md` lists the new jobs.

## Backend choices to know (from its build)

- A change's `defences` is the outgoing reign's; clears (`to: []`) are in `status.changes` with no feed row.
- Kursi reigns always follow the domain chain (editing an old game rewrites them); medal, Sitara and Legend reigns
  start when a recompute first sees them.
- Open nights are never stored; the open-night read and `POST /api/nights/close` look at games ended in the last 12 h.
  `POST /api/nights/close` returns the closed night's detail. Merges don't recompute nights (reads follow merges).
- The Kachuful PUT uses `KachufulUploadOut`, so the Kaali Teeri and Spades PUTs are unchanged.

## Decisions taken

1 seat token everywhere + a stage bust at big moments · 3 build the Kursi now, named "Kursi" · 13 friendly roast ·
14 last month's top 3 defend until 3 qualify · 15 signed out, medals from the device's archive · 16 Wazir and Senapati.
Also: a shared Kursi stays while its best-placed holder at the table is unbeaten. A scorekeeper round plays one big
unlock card (§13 rule 2); hidden achievements reveal once anyone has one.

## Where the code is

| What          | Where                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pure rules    | `src/games/kachuful/domain/{medals,banter,stars,kursi,night}.ts`; `src/progression/{kursi,intel,sikke}.ts`; `src/fx/festival.ts`       |
| Table state   | `src/games/kachuful/state/medals.tsx` (`MedalsProvider`, `useMedalsFor` for the live page, `MedalsValue` for tests)                     |
| Server news   | `src/sync/news.ts` (status per game, closed nights), fed by the PUT (`games/kachuful/sync/engine.ts`) and `sync/seatInvitesLive.ts`     |
| Crowns UI     | `components/crowns/{CrownNews,CrownNewsMount,BountyChips,crownNews}.tsx`; feed lines in `components/progression/feedLine.ts`           |
| Nights UI     | `screens/pages/NightPage.tsx`, `components/{NightLink,NightReady,YourNights}.tsx`, `platform/landing/NightReady*.tsx`                  |
| Moments       | `src/fx/moments.tsx`, `src/fx/ui/MomentPop.tsx` (`round` batches, `ROUND_CAP`)                                                         |
| Strings       | `src/strings/{medals,kursi,crowns,statCrowns,sikke}.ts`, `src/games/kachuful/strings/{banter,night}.ts`                                 |
| Server        | `app/domain/{kursi,crowns,night,sikke}.py`; services `crowns`, `nights`, `sikke`; tests `tests/{domain,services,api}/test_{crowns,nights,night}.py` |
| Fixtures      | `contract/fixtures/{kursi-cases,sikke-rules,night-cases}.json` (export tests beside their rules); copied to the backend `tests/fixtures` |
| Mock API      | `tools/mock-api/server.ts`: medals, kursi, places, sikke, crowns (Kursi only), bounties, nights                                        |
| E2E           | `e2e/{medals,sikke,crowns,nights}.spec.ts`                                                                                             |

## Gotchas learned

- Under reduced motion the shells clear `state.fresh` at once; a show that must still play keeps `fresh` as the
  screen opened (`useMedalTakeover`).
- Decorative glyphs on rows go in CSS (`.mood-glyph::after`), or e2e that read row text break.
- `getByRole('button', { name: 'Next' })` also matches "Tap for the next card": use `exact: true`.
- Global live regions are marked (`data-invite-live`, `data-crown-news-live`); a spec looking for a screen's own
  announcer excludes them.
- Framer's `useReducedMotion` caches the first media query: a unit test can't flip it mid-file.
- A Framer-animated element is centred with the CSS `translate` property (`[translate:-50%_-50%]`), not Tailwind's
  translate classes, which its transform overrides.
- `npm run test:e2e` under load (another test suite running) times out ~10 tests; run it on a quiet machine.

## Next, in order

1. **Run the app against the real backend** (both dev servers): finish a game where the Kursi changes hands, check the
   PUT's `status`, the banner on a second signed-in phone, the feed, bounties, End the night and the Wrapped.
2. `make load` then `make perf` (the Kachuful PUT now recomputes crowns, bounties and nights); the Sikke dry run on
   production data, then tune `LEVELS` and the prices (re-export `sikke-rules.json`, copy to the backend).
3. **G6, phones first:** full e2e on a quiet machine; the responsive audit (`reports/responsive`) at 390×844 and
   360×640/740 for the new screens (crown banner, bounty chips, Your nights, Wrapped cards, Tonight so far, stat
   crowns, festival deal); then tablet and laptop; the four themes; `perf:budget`.
4. G5's remaining non-Bazaar items: firsts and group milestones (a new `backend-requests.md` §8, then both sides).
5. The other games' crowns once a real night with Kachuful has been played (plan §6); stat crowns on their player pages.
6. Art (G0 style sheet → stage bust, `AvatarFill` tiers, "Last game of the night") when Jay wants it.
7. Then delete `REWARDS-PLAN.md`, this file and `backend-requests.md`, and merge.

Not checked anywhere: a real phone, motion on frame by frame, a real night with the group (plan §17).
