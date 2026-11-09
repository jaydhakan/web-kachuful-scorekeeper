# Kaali Teeri plan

**Status:** final, for approval · **Date:** 2026-11-09 · **Working doc:** delete when the game ships in both repos,
never commit.
**Depends on:** [PLATFORM-PLAN.md](PLATFORM-PLAN.md) P0, P1a, P1, P2, P3 and P8 (structure, routing, brand, tokens,
backend `kind`).
**Sources:** `references/kaali-teeri-rules.md` (Jay's house rules) + decisions below; screens from Claude Design round 2
(`references/design-round2/png/kaali-*`) with the corrections in §3.1.

## 1. What we're building

A scorekeeper for **Kaali Teeri** (3 of Spades), built like Kachuful: friends play with a real deck, one phone on the
table runs the game. The app:

- seats 4–10 players, says **which cards to take out** so the deck deals evenly, and rotates the dealer;
- records the **winning bid** (quick mode, the default: the auction happens out loud) or runs the full auction, then
  records **trump** and the **called partner cards**;
- lets the table mark **who played each called card**, which reveals the partners;
- takes **either side's points** at the end of the hand (the defenders' by default), checks them, and scores everyone;
- keeps totals, standings, history, a leaderboard and player stats; works fully offline; syncs when signed in.

It does **not** track tricks or hands of cards (the deck is real, as in Kachuful).

## 2. Rules

Every rule below becomes a characterisation test (phase K0) before any domain code.

### 2.1 Players, decks and dealing

| Rule | Value |
|---|---|
| Players and decks | 4–6 players: **1 deck** (250 points). 7–10 players: **2 decks** (500 points). The deck count follows the player count; it is not a choice. |
| Equal dealing | Zero-point cards are taken out until the deck divides evenly, in this fixed order: 2♣, 2♦, 2♥, 2♠, then 3♣, 3♦, 3♥, then 4♣, 4♦, 4♥, 4♠; with two decks both copies of a card go before the next card. |
| Worked out | 4p: none (13 each) · 5p: 2♣ 2♦ (10) · 6p: all four 2s (8) · 7p: both 2♣, 2♦, 2♥ (14) · 8p: none (13) · 9p: both 2♣, 2♦ + one 2♥ (11) · 10p: both 2♣, 2♦ (10) |
| Card points | 3♠ = 30 · A, K, Q, J, 10 = 10 each · each 5 = 5 · everything else 0. Totals 250 / 500. |
| Dealer | Chosen (or random) for hand 1, then moves one seat per hand in the play direction. |
| Direction | Clockwise by default; anticlockwise in Advanced. Same meaning as Kachuful's `direction`: it changes the seat layout so the screen matches the real table. |

### 2.2 The auction

| Rule | Value |
|---|---|
| Minimum bid | **150** (1 deck), **350** (2 decks). Advanced: adjustable in steps of 5, from half the deck total + 5 up to the total − 5. |
| Step | **5** by default; 10 in Advanced. Bids go up to the deck total (250 / 500). |
| First to speak | The player after the dealer in the play direction (left of the dealer by default). |
| Each turn | Bid higher than the current high bid (or at least the minimum when there's none), or **pass**. |
| Passing | **A player who passed may bid again** when their turn comes round. |
| End of the auction | When **every other player has passed in a row since the last bid**: that bid wins. |
| Everyone passes, nobody bid | The **first speaker (left of the dealer) must take it at the minimum** (150 / 350). No redeals. |
| **Quick mode (default)** | The auction happens out loud; the app records only the result: pick the winning bidder, and the amount, which **starts at the minimum bid** (150 / 350) and goes up in steps. On by default; switching it off gives the full turn-by-turn auction (the rules above). The choice is remembered per device. |

### 2.3 Trump, partners and play

| Rule | Value |
|---|---|
| Trump (*hukum*) | Named by the winning bidder. Always a suit (no "no trump"). |
| Partners (*bheru*) | Called by card: 4p → 1 · 5p → 1 · 6p → 2 · 7p → 2 · 8p → 3 · 9p → 3 · 10p → 4. Not a setting. |
| Two decks | Each called card is one of: **"first played"**, **"second played"**, or **"the other one"**: the bidder holds one copy and calls the copy they don't have, so the table knows only one is left in play. |
| What can be called | Any card still in the deck (taken-out cards can't). The bidder **may call a card they hold** (1st / 2nd played). A card can't be called twice, and "the other one" can't be combined with another call of the same card. |
| "The other one" | Whoever plays it is a partner; it can't be the bidder (they hold the other copy). The bidder's own copy is not a called card, so it adds no slot. |
| First lead | The bidder (shown on screen). |
| Trick rules | Follow suit; trump cuts; highest trump, else highest of the led suit wins; two identical cards: the first played wins; the 3♠ is an ordinary spade. On the Rules page only. |

### 2.4 Scoring (nobody goes negative)

| Outcome | Bidder | Each partner | Each defender |
|---|---|---|---|
| **Made** (team takes ≥ bid) | + bid × slots | + bid × slots | 0 |
| **Missed** | 0 | 0 | **+ bid** |
| **Bidding team sweeps** (takes 250 / 500) | + 250 / 500 | + 250 / 500 | 0 |
| **Defenders sweep** (bidding team takes 0) | 0 | 0 | + 250 / 500 |

- **Team** = the bidder + everyone who played a called card.
- **Slots** = 1 for the bidder + 1 per called card a player played. A partner who played two called cards fills 2 slots
  (2×), the bidder holding one called card fills 2 (2×), the bidder holding two fills 3 (3×). On a miss, slots don't
  matter: the team gets 0.
- A **sweep replaces** normal scoring, slots included: 250 / 500 each, never 2 × 250.
- A bid of 250 / 500 that takes everything is scored as a sweep.
- No bonus for the 3♠ beyond its 30 points.
- **Entering the points:** the table enters **either side's** points; the app works out the other (deck total − entered).
  **Defenders' points is the default** (a smaller pile, quicker to count); a switch changes to the bidding team's.
  Remembered per device. Examples (1 deck, bid 180): defenders took 60 → bidding team 190 → made; defenders took 0 →
  bidding team swept; defenders took 250 → defenders swept.

### 2.5 Game length

Like Kachuful: **Endless** (default; finish any time) or **First to 1000** (the game ends after the hand in which
someone reaches 1000; highest total wins; ties share the place).

## 3. Screens

Phone first; desk follows Kachuful's DeskShell (Workspace: table and score panel stay, the action pane changes). All
four themes, both shells, loading/empty/error states wherever data can be missing.

1. **Setup 1 — players:** player count (4–10) with the table preview; read-only rules line ("1 deck · min bid 150 ·
   call 1 partner"); live "Take out 2♣ and 2♦ · deal 10 each"; game length (Endless / First to 1000); **Advanced**
   (collapsed): direction, minimum bid, bid step.
2. **Setup 2 — seating:** Kachuful's seating flow (registry players, emails when signed in, aliases, photos, same-person
   check), plus the "Bids 1st" badge.
3. **Setup 3 — first dealer and deal:** pick or randomise the dealer; "Take out … · deal N each"; deal animation with
   the shared `PlayingCard`.
4. **Bidding, quick mode (default):** tap the winning bidder's seat; the amount starts at the minimum (150 / 350)
   with −5 / +5 / +10 / +25; **Confirm "Riya · 180"**. A toggle switches to the full auction: the table with each
   seat's last call (bid / Pass), the high bid in the centre, whose turn, the pad (−5 / +5 / +10 / +25, Pass, Bid N)
   and the auction log; when nobody has bid and it comes back round, the first speaker's pad shows only "Take it at
   150".
5. **Trump and call:** the bidder picks trump, then N partner cards (rank × suit). With two decks each card also gets
   **1st played / 2nd played / The other one**. Taken-out and already-called cards are disabled.
6. **Playing:** bidder marked (crown + word), trump, "Riya leads", called cards face down as "?". Each has **Played
   by…** → any seat, the bidder included → the card flips and that player joins the team (link icon + word). Optional
   during play.
7. **Result:** a switch **Defenders' points (default) / Bidding team's points**, then the number, 0–total in steps of
   5, with the other side's total shown beside it ("Defenders 60 → Riya's team 190 · made"). Any called card not yet
   marked is asked for here (required: every called card is played by someone). Then each player's change (with
   "2× · two cards", "Sweep") before Confirm.
8. **Hand summary and scoreboard:** totals, this hand's changes, standings, who deals next; hand-by-hand table (sheet).
9. **Winner:** podium (Kachuful's pattern), share image, rematch with the same seats.
10. **Edit a hand** (from the scoreboard): bid, bidder, trump, called cards, who played them, points; totals recompute
    (never stored).
11. **Hub pages:** History, Leaderboard, Player stats, Rules (with this game's settings). Players is shared with
    Kachuful.

Undo: every committed action (bid, pass, trump, call, played-by, result, next hand), 20-snapshot ring as in Kachuful.

### 3.1 Corrections to the round-2 screens

| Round 2 shows | Build instead |
|---|---|
| 4–12 players, a 1 deck / 2 decks toggle | 4–10; decks follow the count (landing card too) |
| Minimum bid 150 and step as main settings; a partners stepper | Read-only rules line; min bid and step in Advanced; partners fixed |
| Game length Endless / 8 hands / 16 hands | Endless / First to 1000 |
| Bidder can't be picked as their own partner | Any seat, the bidder included |
| Missed: bidder and partners −185 | Bidder and partners 0; each defender +185 |
| No slots or sweep on the result | "2×" badges and the sweep state |
| Full auction is the main bidding screen; quick mode a toggle | Quick mode is the default screen; the auction is the toggle |
| Two-deck copy picker: 1st / 2nd copy played | 1st played / 2nd played / The other one |
| Result asks only for the bidding team's points | Defenders' points by default, with a switch to the bidding team's |

## 4. Data model (`src/games/kaali-teeri/domain/types.ts`)

```ts
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
interface CardRef { rank: Rank; suit: Suit; copy?: 1 | 2 | 'other' }   // two decks only; 'other' = the copy the bidder doesn't hold

interface KtRules {                // stored in the game, so history and the backend check against what was played
  decks: 1 | 2;                    // from the player count
  partners: number;                // from the player count
  minBid: number;                  // default 150 / 350
  step: 5 | 10;                    // default 5
  length: 'endless' | 'to1000';    // default 'endless'
}

type Call = { playerId: string; bid: number } | { playerId: string; pass: true } | { playerId: string; forced: number };

interface KtHand {
  index: number;
  dealerIndex: number;             // derived from index, firstDealerIndex and direction; stored for checks
  phase: 'bidding' | 'calling' | 'playing' | 'result' | 'done';
  mode: 'quick' | 'auction';       // quick is the default
  calls: Call[];                   // the auction in order; empty in quick mode
  bidder: string | null; bid: number | null;
  trump: Suit | null;
  called: CardRef[];
  playedBy: Array<string | null>;  // per called card: the seat that played it (bidder allowed); null until marked
  teamPoints: number | null;       // the bidding team's points, multiple of 5, 0..deck total (scoring reads only this)
  countedBy: 'defenders' | 'bidders' | null;   // which side was entered, so Edit shows the same number back
  doneAt?: number;
}

interface KtGame {
  kind: 'kaali-teeri'; schemaVersion: 1;
  id: string; syncId: string; rev: number; createdAt: number; updatedAt: number; finishedAt?: number;
  players: Player[];               // same Player shape as Kachuful (registry playerId)
  firstDealerIndex: number; direction: Direction;
  rules: KtRules; hands: KtHand[]; status: 'active' | 'finished';
  ui: { view: 'hand' | 'summary' };
}
```

Pure functions, each tested: `decksFor(n)`, `partnersFor(n)`, `removedCards(n)`, `deckTotal(decks)`,
`dealerFor(game, index)`, `firstSpeaker(hand)`, `auction(calls, rules) → { high, holder, toSpeak, done, forcedTo }`,
`validCall`, `team(hand)`, `slots(hand)`, `handScore(hand, rules) → Record<playerId, number>`, `totals(game)`,
`standings(game)`, `gameOver(game)`, `validate(game) → reason | null` (the backend's reason list), `summary(game)`,
`peek()`.

## 5. Frontend structure

```
src/games/kaali-teeri/
  domain/    types, cards (removal, points), auction, scoring, standings, stats, validate, demo game, fixtures export
  state/     reducer + actions, store (KtProvider), persistence keys, migrations, undo
  screens/   setup/, hand/ (Bidding, Call, Play, Result, Summary), Winner, desk/
  sheets/    rules, scoreboard, edit hand, card picker
  strings/   every user-visible string
  sync/      endpoints + engine (shares src/sync/api.ts and the session)
  index.tsx  the lazy root the platform registry loads
```

**Lifted out of Kachuful** into shared code, each its own commit with Kachuful's tests green: the seating flow
(Setup 2), `Table` + `tableGeometry` (up to 10 seats here; Kachuful already does 14), `PlayingCard` + deck art and
Emerald stand-ins (platform §7), the bid keypad, the Winner podium, the share image builder.

**Storage:** `kaaliteeri.v1`, `kaaliteeri.undo`, `kaaliteeri.screen`, `kaaliteeri.lastGroup` through `persistence.ts`;
IndexedDB version bump adds a `ktGames` store (`archive.ts` stays the only IndexedDB access); the players store is
shared. Migrations table from schema 1.

## 6. Stats, leaderboard and history

Per player (domain functions; the backend mirrors them):
- games, wins, win %, average place, total points, best game;
- hands bid, bids made, **made %**, average bid, highest bid made, hands lost as bidder, sweeps;
- times called as partner, partner win %, double slots;
- most frequent partner and how it goes; head-to-head;
- streak of made bids.

Leaderboard: today, this week, this season, all time; sort by points, wins, made %. **Later (phase 2):** achievements,
daily awards, seasons, Wrapped.

## 7. Backend (written into `backend-requests.md` at K7, then built in `../backend-kachuful-scorekeeper` in the same task)

Builds on platform P8 (`games.kind`). Players are shared with every game: include platform §8 item 5 (player-wide
queries, unused-player delete, counters and merge must count Kaali Teeri games) in this phase's `backend-requests.md`.

### 7.1 Tables
- `games` row with `kind = 'kaali-teeri'`, `payload` = `KtGame`, `summary` in Kaali Teeri's shape.
- **`kt_hands`** (derived on upload, same transaction): game_id, hand_index, dealer_id, bidder_id, bid, forced (bool),
  trump, partner_ids uuid[], slots jsonb, team_points, made, sweep (`none|bidders|defenders`), done_at.
- **`kt_game_players`**: game_id, player_id, points, place, won, hands_bid, bids_made, times_partner, partner_made,
  double_slots, sweeps.
- **`kt_player_day`**: player_id, day (APP_TZ), games, wins, points, hands_bid, bids_made, partner_hands, partner_made.
  Boards read only this and `kt_game_players`, never `payload`.
- Indexes with `EXPLAIN` tests for every list and board query.

### 7.2 Routes (new; Kachuful's routes unchanged)
| Route | Purpose |
|---|---|
| `PUT /api/kaali-teeri/games/{id}` | Upload with Kachuful's semantics: owner/admin, rev, 409 `stale` with `server`, 410 `gone`, 422 `unknown_player`, `remap` |
| `GET /api/kaali-teeri/games` | List (`updatedSince`, `cursor`, `mine`, `involving`, `status`), tombstones |
| `GET /api/kaali-teeri/games/{id}` · `DELETE` | One game; soft delete |
| `GET /api/kaali-teeri/bootstrap` | My games and stats for this game (players come from the shared bootstrap) |
| `GET /api/kaali-teeri/leaderboard` | `period`, `sort`; ETag |
| `GET /api/kaali-teeri/players/{id}/stats` · `/games` · `/{a}/vs/{b}` | Profile, games, head-to-head |
| Live and recap links | Reuse `/api/games/{id}/links` once it accepts any kind (platform P8); public bodies carry `kind` |

### 7.3 Validation (Python mirror of the TS domain)
`app/domain/kaali_teeri/rules.py` (decks, removal, points, partners, auction, slots, scoring) and `validate.py`:
`422 invalid_game {reason, handIndex}` with reasons `players`, `rules`, `dealer`, `auction`, `bid`, `trump`,
`called`, `played_by`, `team_points`, `times` (new codes: listed in `backend-requests.md`).

### 7.4 Golden fixtures
`src/games/kaali-teeri/domain/fixtures.export.test.ts` writes `contract/fixtures/kt-*.json`: 4p, 5p, 6p (1 deck);
7p, 9p, 10p (2 decks); quick mode; a full auction; "the other one" called; points entered by each side; a re-entry
after a pass; a forced minimum bid; a missed bid; a double-slot win;
the bidder holding a called card; both sweeps; a 250 bid; an edit; a game to 1000. Plus `kt-invalid-*.json`, one per
reason. The backend copies them and tests derive and board parity, as for Kachuful.

### 7.5 Mock API
`tools/mock-api` serves the same routes using the TS domain, so e2e runs without the backend.

## 8. Phases

Percentages are of this plan.

| # | Phase | Size | % at end |
|---|---|---|---|
| K0 | §2 as characterisation tests (failing until K1) | S | 5% |
| K1 | Domain: types, removal, auction, scoring, standings, validate, demo game, stats; full branch coverage | M | 20% |
| K2 | State: reducer, actions, undo, persistence, migrations, archive store | M | 30% |
| K3 | Lift shared pieces out of Kachuful (seating, table, PlayingCard, keypad, podium) | M | 40% |
| K4 | Phone screens: setup 1–3, bidding, call, play, result, summary, winner, sheets | L | 60% |
| K5 | Desk screens and keyboard shortcuts | M | 70% |
| K6 | Hub pages: history, leaderboard (local), player stats, rules | M | 78% |
| K7 | Backend: `backend-requests.md`, then migration, tables, routes, validation, fixtures, tests | L | 90% |
| K8 | Sync, online boards, live and recap links | M | 96% |
| K9 | Themes (all 4, Emerald art and stand-ins), a11y, 44px, responsive audit, e2e, bundle, docs | M | 100% |

## 9. Testing

- **Domain:** every rule in §2; removal for 4–10 players; auction property tests (it always ends; the winner's bid is
  the highest; re-entry after a pass; forced minimum only when nobody bid); scoring property tests (nobody negative;
  a miss pays only defenders; a sweep pays exactly 250 / 500 per member; slots multiply only a made bid).
- **Reducer:** every action; illegal actions ignored; undo; migrations from saved fixtures.
- **e2e:** full games at 4, 6, 7 and 10 players; quick mode (default) and full auction; "the other one" with two
  decks; points entered as defenders and as bidders; re-entry; forced minimum; partner marked late; bidder
  holding a called card; sweep; edit a hand; First to 1000 ends correctly; offline throughout; reload mid-hand; desk
  keyboard flow; all 4 themes with equal geometry on bidding and call; axe; 44px targets; responsive matrix.
- **Backend:** happy path, each error code, each permission, fixture parity, EXPLAIN on board queries.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Other groups play other house rules | Min bid, step, direction and length are stored per game; the backend validates against the game's own rules. More options can be added later without a data migration. |
| Ten seats crowd a phone table | Kachuful already handles 14 seats: same geometry and nameless-avatar mode. |
| No real deck art for most cards | Our Emerald stand-ins until you add the images (one file + one token each). |
| Marking "played by" is fiddly at the table | Optional during play; required once at the result. |
| Pressure to track tricks | Out of scope: the deck is real. |

## 11. Out of scope (for now)

Achievements, awards, seasons, Wrapped (phase 2); tracking tricks; online play without a real deck.

## 12. Build status (2026-11-09, end of chat 1)

Done and committed on `main` (frontend, not pushed): P0 (brand kit in public/ + design/brand), P1a (Kachuful moved to
src/games/kachuful, shared code in src/people, src/platform/pages), P3 (tokens), K0–K1 (domain, 100% covered, 33
golden fixtures in contract/fixtures/kt-*.json), K2 (state: reducer, undo, persistence keys kaaliteeri.*, IndexedDB v2
`ktGames`, circle() across games, peek), K3 (shared Table w/ marks+badges, PlayingCard + Emerald stand-ins, seating
flow in src/components/seating, BidKeys/BidStepper, Podium, shareImage), K4 (all phone screens: shell, home, setup 1–3,
bidding quick+auction, call, play, result, summary, scoreboard, edit hand, winner, menu, confirm, rules, share).

Backend (../backend-kachuful-scorekeeper, committed on its main, NOT pushed — a push deploys prod): games.kind +
kind-filtered Kachuful endpoints, player-wide seat registry (SEAT_TABLES / RESEAT_BY_KIND), full Kaali Teeri backend
(migrations 0016, 0017; /api/kaali-teeri/*; share links per kind; "Baithak" in previews; delete/merge/prune cover KT).
733 tests pass (1 known local failure: pg_dump 14 vs server 16).

On branches with git worktrees under .claude/worktrees/ (NOT merged):
- `worktree-agent-ab087d6e2409411fe`: P1+P2 routing, registry (src/platform/catalog.ts, PlatformRoot), Kachuful lazy
  root + peek, multi-page HTML, manifest, e2e helper → /kachuful. 4 commits, final verification (e2e) not confirmed.
  Branched from an older main: merge/rebase onto main and resolve.
- `worktree-agent-a1478afcad4cfde5b`: K5 desk layout, one WIP commit, unfinished.
- `worktree-agent-a1102e5d2d75346a0`: K6 hub pages, one WIP commit, unfinished.

Left: merge the 3 branches (finish K5, K6); P4 landing page, P5 "All games" + transition, P6 account/theme/service
worker at platform level (ThemeSync, ServiceWorkerHost, AccountChip etc. still read Kachuful's store; KT has small
copies); flip Kaali Teeri to 'live' in the registry; K8 sync (KT engine on /api/kaali-teeri/*, met from KT player-games,
online boards, live/recap links in the Share sheet); K9 polish + e2e (plan §9 list) + bundle + docs; delete working docs.

### Polish list (found in review)
- Podium ties: ranks 1,2,2,4 show one player on 2nd and an empty 3rd step; tied players must share the step.
- drawShareCanvas leaves a big empty area above the podium.
- Quick bid shows the amount twice (table centre + stepper): centre should show bidder/prompt.
- CardPicker sheet has no visible primary confirm at the bottom.
- Auction → quick switch discards calls silently: toast with Undo.
- Table seat accessible name includes emoji + chip text ("🙂 Riya Bids 1st").
- MenuRow/MenuButton, ThemeBody, SetupFrame/TableSlot duplicated from Kachuful: move to components/ui.
- Menu "All games" uses location.assign('/'): use platform go().
- Setup 3 has no seat-swap UI (state has setupSwap).
- Bundle: phone first-load JS 152 KB > 145, large 169 > 165 (over before this work); main CSS 22.1 > 22 KB.
- Leaderboard made %: K6 brief says min 5 bids to rank (Jay to confirm; backend currently has no minimum).
- Cleanup 2026-11-09: design prompts, round-1 screenshots, brand-kit copy removed; round-2 screens and rules
  files moved to `references/` (git-ignored; delete once both games ship).
- Backend deploy/ folder was deleted in Jay's own commit 557a4dd (Nov 1); only initdb.sql restored.
