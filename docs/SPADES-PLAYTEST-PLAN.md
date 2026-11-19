# Spades playtest fixes — plan

Written 2026-11-19 after Jay played online Spades on a phone (Emerald Gilt theme, four players). This is a **working doc**
(CLAUDE.md: never commit it; delete it once the chosen work is built, tested and committed in both repos).

Jay picks options in §1. Each work item then has its own section (§3–§8) with the exact files, the code to change,
the tests to add and how to check it. Everything here was checked against `main` (`903ebd1`) on 2026-11-19.

---

## 0. Read this first (for whoever executes the plan)

1. Read `CLAUDE.md`, `docs/codebase/CONTRIBUTING.md`, `docs/codebase/ARCHITECTURE.md` and `docs/codebase/TODO.md`
   (the Spades section) before touching code.
2. Rules that apply to every item below:
   - **Strings** go in `src/games/spades/strings/play.ts` (never inline English in a component).
   - **Colours** are tokens only: new colours go in `src/styles/themes.css` (and per-theme files only if a theme must
     differ), exposed through Tailwind names or `var(--…)`. Lint fails on hex in components.
   - **Animate only `transform` and `opacity`.** Every animation needs a reduced-motion fallback (see
     `src/games/spades/ui/play.css` for the pattern: `@media (prefers-reduced-motion: reduce)`).
   - **44px tap targets**, real `<button>`s, `aria-label`s, visible focus rings.
   - **No new dependency.** **No game-rule or scoring change.** None of the items below changes rules.
   - **Backend changes** go in `backend-requests.md` at the repo root first (only item 3-D needs one), then are built
     in `../backend-kachuful-scorekeeper` following that repo's CLAUDE.md.
   - Comments: 1–3 lines, the non-obvious _why_ only.
   - Conventional Commits, one concern per commit, **no co-author trailer**. Don't push.
3. Checks before calling an item done: `npm run typecheck && npm run lint && npx vitest run`, then the Spades e2e specs
   (`npx playwright test e2e/spades-*.spec.ts`), then the full `npm run test:e2e` once at the end. Rerun a failure alone
   with `npx playwright test --last-failed --workers=1` before treating it as real.
4. Report progress as a percentage of the whole plan at least every 5%.
5. When finished: remove the items you fixed from `docs/codebase/TODO.md` and add anything left undone. Delete
   `test-results/`, `playwright-report/` and any screenshots you made.

**How to look at the online table yourself.** `npm run dev:mock` runs the app against the in-memory API. The e2e
helpers in `e2e/spades-helpers.ts` (`accounts`, `phone`, `seatedTable`, `act`, `viewOf`) seat four phones and drive
the table through the API. `e2e/spades-online-hand.spec.ts` is the model to copy. Note: while signed in, writing
`kf.theme` to `localStorage` does **not** switch the theme (the account's theme wins). Switch the theme from the Me page
in the test instead.

---

## 1. Decision sheet (Jay ticks one option per row; ★ = recommended)

| #   | Problem                                                      | Options (details in the section)                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bid pad hides the other players' bids                        | **1-A ★** "Bids so far" strip inside the pad · **1-B ★** smaller pad, anchored low so the side seats stay visible · **1-C** hold-to-peek button that fades the pad · **1-D ★** team bar shows running bids instead of "bidding…". Several can be combined: ★ = A+B+D |
| 2   | Cards hard to read (suits, red vs red, Emerald worst)        | **2-A ★** Spades always draws classic cards (no theme card art) · **2-B ★** bigger, bolder corner index · **2-C** four-colour deck as a setting · **2-D ★** lighter "can't play" dimming · **2-E** flatter fan · **2-F** bigger cards on the felt                   |
| 3   | Screen freezes (stale turn; stuck on round-end scores)       | **3-A ★** close the round summary when the next hand is dealt · **3-B ★** resync when the phone comes back · **3-C ★** stale-view watchdog · **3-D ★** backend keeps the newest update when a phone's queue is full · **3-E** debug overlay for the next playtest  |
| 4   | "Us"/"Them" looks bad, and "Them win!" is broken English     | **4-A ★** real names ("You & Taha" vs "Sara & Zhsxq") · **4-B** fun team names generated per table · **4-C** host names the teams in the lobby (backend) · copy deck for wins/losses: **Classic / Gen-Z / Desi / Gen-Z+Desi mix ★** · **4-D ★** your team always on the left |
| 5   | Can't switch the selected card; want "tap table to play"     | **5-A ★** fix the overlap bug (required) · **5-B ★** tap the table to play the lifted card, with a glowing drop slot · **5-C** optional "play with one tap" setting                                                                                                   |
| 6   | Other UX improvements I found                                | Pick any: 6.1 turn line in the centre ★ · 6.2 "Your turn" over open sheets ★ · 6.3 last-trick button moved off the centre (required if 5-B) · 6.4 haptic on lift ★ · 6.5 auto-play the only legal card (setting) · 6.6 toast placement · 6.7 bid hint (setting)                  |

Suggested order if everything ★ is picked: **3-A → 5-A → 3-B/3-C → 3-D (backend) → 2-A/2-B/2-D → 1-A/1-B/1-D →
5-B + 6.3 → 4 → 6.x.** Freezes and the "plays the wrong card" bug first, because they lose games.

Parallel split (CLAUDE.md asks for parallel agents where files don't overlap):

- Agent 1: §5 (freeze: `src/sync/sse.ts`, `online/state/link.ts`, the summary part of `PlayTable.tsx`), plus the backend 3-D.
- Agent 2: §4 (cards: `ui/SpCard.tsx`, `ui/Hand.tsx` dim only, `styles/themes.css`, `ui/fan.ts`).
- Agent 3, after Agent 2 finishes `Hand.tsx`: §7 (selection and tap-to-play), §3 (bid pad), §6 (names).
  These all touch `PlayTable.tsx` and `Hand.tsx`, so run them one after another.

---

## 2. What I found (diagnosis)

| #   | What Jay saw                                       | Root cause (verified in code unless marked)                                                                                                                                                                                                                                                                                                                                                                                                                         | Where                                                                       |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Can't see others' bids while bidding               | The pad is centred on the felt, 368px wide, ~300px tall (`grid place-items-center`), and covers the left and right seats and their bid pills. The pad's only info line is the partner's bid. The team bar says "bidding…" until all four have bid. Confirmed in a screenshot of our own table (390×844).                                                                                                                                                         | `ui/BidPad.tsx`, `PlayTable.tsx:1013`, `ui/TeamBar.tsx`                     |
| 2   | Suits hard to tell apart, Emerald worst            | (a) `SpCard` draws its own flat face with big corner indices, **then lays the theme's art on top**: Emerald Gilt has a full-card stand-in SVG for every card (`emerald-gilt.css`, `.card-standin[data-card=…]`) plus four photo cards. In a fan only a ~25px strip of each card shows, so on Emerald you see a gold frame and a small, ornate index instead of ours. (b) Emerald's "black" ink is dark green (`--card-fg: #123d26`). (c) In every theme ♥ and ♦ are the same red. (d) Cards you can't play are covered by a 55% background-colour wash, which greys the index too. | `ui/SpCard.tsx`, `styles/themes/emerald-gilt.css`, `ui/Hand.tsx:384`        |
| 3a  | Round-end scores "freeze"                          | When a hand ends, every phone opens the full-screen summary sheet. Only the dealer's sheet closes itself (by dealing). On everyone else's phone **the sheet stays open after the next hand is dealt**, still saying "X deals next", with the new deal, the bidding and even your own turn hidden behind it. Nothing in the new-deal code (`PlayTable.tsx:223`) closes it. This matches both symptoms: stuck on scores, and "everyone sees it's my turn but my screen doesn't". | `PlayTable.tsx:223`, `:507`, `:790`                                         |
| 3b  | Screen stuck on someone else's turn                | The table follows a server-sent event stream (`src/sync/sse.ts`). If the connection dies silently (screen locked, app switched, Wi-Fi to 4G, iOS suspending the tab), the app only notices after **60s without a byte** (`SILENCE_MS`). Until then the status stays "live", so no "Reconnecting" pill shows. There is no `visibilitychange` handling: coming back to the tab doesn't refresh anything.                                                                | `src/sync/sse.ts:9`, `online/state/link.ts`                                 |
| 3c  | Same, on one phone only                            | **Backend:** each follower's queue holds 16 messages, and when it is full the **newest** update is dropped ("live viewer queue full; skipping an update"). A phone on a weak connection backs up its queue; if the dropped update is the one that moved the turn, that phone stays on the old turn until something else changes. The app never polls, so nothing repairs it. Check production logs for that warning around the playtest's time to confirm. | `backend …/app/live/hub.py:40`, `:394`                                      |
| 3d  | "Only me (host/admin)"                             | No code path treats the host or an admin differently for turns, the stream or the summary. Most likely it was Jay's phone (the screenshots are an iPhone; iOS suspends background tabs and their fetch streams hardest) and/or Jay leaving the summary open longer than the others (3a). **Unverified**; 3-E would prove it next time.                                                                                                                        | —                                                                           |
| 4   | "Us win / Them win" looks bad                      | `s.team.us`/`s.team.them` feed every label, including `s.winner.title` → "Them win!" and toasts like "Ten bags: Them lose 100." The team bar always shows team A on the left, so on team B you see "Them" first.                                                                                                                                                                                                                                         | `strings/play.ts:27`, `:331`, `:339`, `PlayTable.tsx:168`, `Winner.tsx:79`  |
| 5   | Can't pick another card once one is selected       | **Real bug.** A lifted card gets `zIndex: 40` (`Hand.tsx:370`) but rises only 24px. It now covers the visible strips of the 2–3 cards to its right, except their bottom 24px. **Tapping the card to the right of a selected card hits the selected card and plays it.** Cards to the left switch fine. (The TODO already noted "a pointer on the overlapping fan lands on the next card" in e2e: the same overlap.) Tapping the selected card again does play it (`Hand.tsx:305`). | `ui/Hand.tsx:370`, `:305`                                                   |

What the reference app does well (and we should take): every player's bid is always visible on the table; the status
line says whose turn it is ("Bidding in progress – zhsxq_188's turn"); cards are plain, high-contrast and have big
corner indices; when you lift a card a glowing slot on the table shows where it will go, and tapping there plays it.
What we keep and must not lose: the deal animation, card flights, the crack when spades break, Boston, emoji rain,
the halos, sounds and haptics, and our team bar with bags.

---

## 3. Item 1 — See everyone's bid while bidding

Files: `src/games/spades/ui/BidPad.tsx`, `src/games/spades/online/table/PlayTable.tsx` (the `showPad` block at
`:732` and the pad render at `:1013`), `src/games/spades/ui/TeamBar.tsx`, `src/games/spades/strings/play.ts` (`bid`
and `team` groups).

### 1-A ★ "Bids so far" strip inside the pad

At the top of the pad, under the title, show one row of three chips, one per other player, in table order starting
with the player on your left (left → partner → right, the same order as the seats on screen):

```
 Your bid
 ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ 🦉 Zed  2 │ │ 🦊 Taha 3 │ │ 🐯 Ria  … │     ← avatar, short name, bid ("Nil", "Blind Nil", "…" = to bid)
 └──────────┘ └──────────┘ └──────────┘
 Team: Taha 3 + you · They have 2 so far
```

- The partner's chip has an accent outline (`ring-1 ring-[var(--accent)]`), and a "Partner" label for screen readers.
- A player still to bid shows `…` in `text-[var(--tx2)]`.
- Replace the current `info` line with a team line: `s.bid.teamLine(partnerName, partnerBid, themSoFar)`. Keep the
  minimum-bid wording (`s.bid.partnerMin`) when `minTeamBid` applies.
- Data: add a prop to `BidPad`:
  ```ts
  /** The other three seats, left to right as on the felt. */
  others: { seat: Seat; name: string; face: Face | null; bid: number | null; blind: boolean; partner: boolean }[];
  ```
  Build it in `PlayTable.tsx` next to `bidInfo` from `t.bids`, `t.blind`, `realNames`, `faces`, ordering seats by
  `placeOf(x, viewer)` (1, 2, 3). Use the shared `Avatar` (`src/components/ui/Avatar.tsx`) at its smallest size.
- Chips are not buttons (no action), so they are a `<ul>` with an `aria-label` (`s.bid.othersLabel`).
- Truncate names with `trunc` from `src/lib/format.ts` (8 characters).
- Test: `BidPad` unit test (new `ui/BidPad.test.tsx`): renders three chips with the right bids, `…` for null,
  "Nil"/"Blind Nil". Extend `PlayTable.test.tsx`: with three bids in, the pad lists all three.

### 1-B ★ Smaller pad, anchored low

- Make the keys a fixed **7 columns** (two rows: Nil 1–6, 7–13), 44px tall, so the pad is ~2 rows shorter. Today it is
  5 columns below 340px of container width (`grid-cols-5 @[21.25rem]:grid-cols-7`). At 320px wide 7 columns give
  ~40px keys: keep `h-11` (44px) height and let the width drop to 40px (acceptable; the key's box is still 44px tall).
- Move the pad from the felt's centre to its lower part: in `PlayTable.tsx:1013` change the wrapper from
  `grid place-items-center` to `flex items-end justify-center pb-2`. The left/right seats sit at about 40–50% of the
  felt's height (see `SEAT_AT` in `Felt.tsx`), so a ~230px pad anchored to the bottom keeps them and their pills
  visible on a 390×844 phone. Only your own seat (bottom) is covered, which is fine: you are the one bidding.
- Check at 320×568, 360×780, 390×844 and 430×932 (the `spades-responsive.spec.ts` sizes) that the side seats' pills
  are not covered. Add an assertion to `spades-responsive.spec.ts`: while the pad is open, the left and right seats'
  bid pills' bounding boxes don't intersect the pad's box.

### 1-C (optional) Hold to peek

A small "eye" button in the pad's header. While pressed (pointer down / Space held), the pad fades to `opacity: 0.12`
(an opacity transition, so reduced motion is fine) and gets `pointer-events: none` except the eye button. Only needed
if 1-B is not picked.

### 1-D ★ Team bar shows running bids

`TeamBar` shows `s.team.bidding` ("bidding…") while `contract === null`. Instead, show the bids made so far:
`3 + …` (partner bid 3, other still to bid), or `Nil + …`. Add `partial: (number | null)[]` (the two seats' bids) to
`TeamLine` and build it in `PlayTable.tsx` `teamLines` from `t.bids`. String: `s.team.partial(a, b)` where null renders
`…`. Unit test in `ui/ui.test.ts` or a new `TeamBar.test.tsx`.

---

## 4. Item 2 — Cards you can read at a glance

Files: `src/games/spades/ui/SpCard.tsx`, `src/games/spades/ui/Hand.tsx`, `src/games/spades/ui/fan.ts`,
`src/styles/themes.css`, `tailwind.config.*` (for new colour names), `src/games/spades/ui/prefs.ts` and
`online/table/Sheets.tsx` (`PrefsBody`) for 2-C.

### 2-A ★ Classic cards in Spades, in every theme

"For now use normal proper cards." Spades stops drawing the theme's card art on **faces**. Card **backs** keep the
theme's art (backs are never read, and they keep each theme's character).

- In `SpCard.tsx`, delete the two art layers on the face:
  `<i data-card={key} className="card-standin card-art …" />` and `<i className="card-photo card-art …" />`.
  `PlayingCard` (Kachuful, Kaali Teeri) is untouched, so other games keep their art.
- Add classic card tokens to `src/styles/themes.css` at `:root`, **not overridden by any theme file**, so every theme
  draws the same card:
  ```css
  --sp-card-face: #ffffff;
  --sp-card-ink: #111111;   /* spades, clubs */
  --sp-card-red: #d0021b;   /* hearts, diamonds */
  ```
  (Hex is allowed here: this is a colour file.) Expose them as Tailwind colours (`sp-card-face`, `sp-card-ink`,
  `sp-card-red`) the same way `card-face`/`card-red` are exposed (search `tailwind.config` for `card-red`).
- In `SpCard.tsx` use `bg-sp-card-face`, `text-sp-card-ink`, `text-sp-card-red` instead of `bg-card-face`,
  `text-card-ink`, `text-card-red`.
- Give the face a hairline edge so a white card reads on a light felt (Editorial Paper):
  `shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sp-card-ink)_14%,transparent),…existing shadow]`.
- Also check the mini cards (`size="mini"`) in the hand summary and the last-trick sheet: they use `SpCard`, so they
  follow automatically. Confirm visually.
- Remove the comment line in `SpCard` that says a theme with deck art covers the flat face, and say instead that
  Spades always draws its own faces because the fan shows only a strip of each card.
- Test: `ui/ui.test.ts` (or a new `SpCard.test.tsx`): a face renders no `.card-standin`/`.card-photo`. e2e
  `themes.spec.ts`: if it asserts Emerald's stand-ins are fetched on a Spades page, change that assertion (Kachuful
  still fetches them).

### 2-B ★ Bigger, bolder corner index

The index is the only part of most cards you can see. Today: rank `text-16` (`text-18` when the card is ≥60px wide),
suit below it at the same size.

- In `SpCard.tsx` `TYPE.hand`, raise to `ix: 'text-20'`, `ixBig: 'text-22'`, and make the suit symbol under the rank
  one step **larger** than the rank (`text-22`/`text-24`): the suit is what people misread. Use only sizes on the
  type scale (DESIGN-SYSTEM.md); if `text-22`/`text-24` aren't on it, use the nearest that is.
- Rank weight `font-extrabold` (800) and `tracking-[-0.06em]` so "10" fits the strip.
- Pull the index tighter into the corner: `left-[6%] top-[3%]`.
- **The strip must fit the index.** The strip is `strip(fan, i)` in `fan.ts` (about 25px at 390px wide). Add a unit
  test in `ui/ui.test.ts`: at widths 320, 360, 390, 430, `strip()` ≥ the index's width (assume 0.62 × font-size × 2
  characters for "10"). If 320px fails, keep the old size below `cw < 52` (`big` is already passed in; add a `small`
  case).
- Look at it: screenshot the hand at the four phone sizes with the e2e helpers and check every rank and suit is
  readable in the strip, including "10".

### 2-C (optional setting) Four-colour deck

The standard fix for ♥ vs ♦ and ♠ vs ♣ in online card games: ♠ black, ♥ red, ♦ blue, ♣ green.

- Tokens in `themes.css` `:root`: `--sp-card-blue: #0b5ed7; --sp-card-green: #1a8a3a;` (+ Tailwind names).
- `SpPrefs` gets `deck: 'two' | 'four'` (default `'two'`), validated in `readPrefs` like `sort` (add `DECKS`). This
  is new data in the existing `spades.prefs` key: unknown values fall back, so no migration is needed.
- `SpCard` takes the colour from a `data-deck` attribute on the table root (set in `PlayTable` from prefs) or from a
  prop; prefer the attribute plus CSS (`[data-deck='four'] .sp-ink-diamonds { color: var(--sp-card-blue) }`) in
  `play.css`, so `SpCard` doesn't need the prefs hook.
- `PrefsBody` in `online/table/Sheets.tsx`: a two-option toggle "Card colours: Classic · Four colours", with a tiny
  preview of ♠♥♦♣ in each.
- Tests: prefs read/write round trip (`ui/ui.test.ts` has prefs tests to copy); `SpCard` gets the right class.

### 2-D ★ Lighter "can't play" dimming

Today an unplayable card gets a `var(--bg)` wash at 55% (`Hand.tsx:384`), which turns the index grey-brown.

- Change the wash to a neutral shade at about 28%:
  `bg-[color-mix(in_srgb,var(--shade)_28%,transparent)]`.
- Make the **playable** cards stand out instead: when it's your turn to play and some cards are unplayable, nudge the
  playable ones up 8px (add to `base(i, lift)` in `Hand.tsx` an extra `- (playableNudge ? 8 : 0)` for cards with no
  problem). This rides on the existing `.sp-hc` transform transition, so reduced motion already becomes a fade.
- Check that the index of a dimmed card still reads (contrast ≥ 3:1 against the dimmed face).

### 2-E (optional) Flatter fan

The fan tilts each card up to 2.6° (`fan.ts`, `tilt`). Tilted indices are harder to read. Lowering `tilt` to
`Math.min(1.4, 18 / n)` and the arc from 14px to 8px keeps the "hand in an arc" look but makes the indices nearly
upright. Update `fan.ts`'s tests if any pin the numbers.

### 2-F (optional) Bigger cards on the felt

The trick cards (`size="slot"`, 52–64px) are small next to the reference app. Find where the slot width is set in
`Felt.tsx` (`TrickCard`) and allow up to 76px on phones ≥ 390px wide, keeping the four cards inside the felt's centre
area. Check the sweep animation still lands on the avatars.

---

## 5. Item 3 — No more frozen screens

Do **3-A first**: it is the clearest bug and small.

### 3-A ★ Close the round summary when the next hand is dealt

File: `src/games/spades/online/table/PlayTable.tsx`.

- In the new-deal block (`if (lastDeal !== dn) { … }`, line ~223), add:
  ```ts
  // The summary belongs to the hand just finished: the new deal closes it on every phone, not only the dealer's.
  setSheet((x) => (x === 'summary' ? null : x));
  ```
  `setSheet` with a function form during render is fine here (the block already sets state during render; React
  allows a component to update its own state while rendering).
- Then show a toast so people know why it closed: `showToast(s.toast.dealt(handNo))` → "Hand 3 is dealt". Do it in an
  effect keyed on `dn` (not during render): `useEffect(() => { if (dn > 1 && sheetWasSummary.current) showToast(…) }, [dn])`.
  Keep a ref `sheetWasSummary` set in the block above.
- While the summary is open and it's a non-dealer's phone, the footer says "X deals next" (`s.summary.waitDeal`).
  Keep it, but make the `Done` button the accent button so it is obviously the way out.
- Also: if it becomes **my turn** while any sheet except `menu`, `prefs` and `invite` is open, close that sheet
  (`board`, `last`, `keys`, `summary`). In the "Your turn" effect (`turnKey`), add
  `setSheet((x) => (x === 'board' || x === 'last' || x === 'keys' || x === 'summary' ? null : x))`.
- Tests (`PlayTable.test.tsx`, which has a fake table fixture in `__fixtures__/fakeTable.tsx`):
  1. Hand ends → summary opens → a view arrives with the next deal (`history.length` same, `phase: 'bidding'`,
     `tricks: []`) → the summary dialog is gone.
  2. Board sheet open → a view where `turn === me` → the board sheet closes.
- e2e: `spades-online-hand.spec.ts` already plays to the next deal; add: a **non-dealer** phone that never taps Done
  sees the summary close by itself after the dealer deals.

### 3-B ★ Resync the moment the phone comes back

Files: `src/sync/sse.ts` (shared by the user stream and the Spades table), `src/games/spades/online/state/link.ts`.

- In `followStream` (`sse.ts`):
  - Keep a `lastByte = Date.now()` updated in `quiet()`.
  - Listen to `document` `visibilitychange` and `window` `pageshow`. When the page becomes visible: if
    `Date.now() - lastByte > 5_000` (or the page came back from the bfcache, `event.persisted`), **abort the current
    request and open a new one at once** (`attempt = 0`), the same way `online()` does. Remove both listeners in the
    returned stop.
  - Lower `SILENCE_MS` from 60s to **40s** (pings come every 25s; 40s still allows one late ping). Update the comment.
- In `TableLink` (`link.ts`):
  - On `visibilitychange` → visible, call `this.load()` (one `GET` of the table) so the view is fresh even before the
    stream reopens. Add/remove the listener in `start()`/`stop()` like the `online`/`offline` ones.
- Tests: `src/sync/sse.test.ts` (create it if absent; mock `fetch` with a never-ending body): after
  `visibilitychange` with the page hidden for 6s (fake timers), a second `fetch` happens. `link.test.ts`: a visible
  event calls the view endpoint (`deps` can't inject `spEp`; spy on `spEp.view` with `vi.spyOn`).

### 3-C ★ Stale-view watchdog (repairs dropped updates)

File: `src/games/spades/online/state/link.ts`.

- Record `lastStateAt = Date.now()` in `adopt` whenever a view is taken.
- While `start()`ed, run `setInterval(check, 5_000)`. In `check`: if the table's `status === 'playing'` and
  `Date.now() - lastStateAt > 15_000` and no `load` is in flight, call `this.load()`. Clear it in `stop()`.
- Cost: at most one small GET per 15s per phone while nothing changes; nothing extra while the game is moving.
- Also show the user when the view may be stale: add a `stale: boolean` to `LinkState` (true while a watchdog load is
  in flight after 15s of silence). `PlayTable` already shows a "Reconnecting…" pill for `reconnecting`/`error`; show
  the same pill with `s.centre.checking` ("Checking the table…") while `stale`.
- Tests in `link.test.ts` with fake timers: no frames for 16s → one `GET`; frames arriving every 5s → no `GET`.

### 3-D ★ Backend: keep the newest update when a phone falls behind (backend change)

Write this into `backend-requests.md` at the repo root, then build it in `../backend-kachuful-scorekeeper`:

> **Live hub: a full follower queue drops the oldest message, not the newest.** `app/live/hub.py` `_offer` drops the
> incoming message on `QueueFull`. `state` frames are full snapshots, so the newest is the one that matters; dropping
> it leaves a slow phone on an old turn until the next change. Change `_offer` to: on `QueueFull`, `get_nowait()` one
> message (the oldest) and `put_nowait()` the new one; keep the warning log. Optionally raise `QUEUE_SIZE` from 16 to
> 64. Test: a queue of size 2 offered three states holds the 2nd and 3rd.

No API shape changes; the app needs nothing new for it. Before building, **check production logs** for
`live viewer queue full` around the playtest (2026-11-18/19) and note the result in the PR: it confirms or rules out
this cause.

### 3-E (optional) Debug overlay for the next playtest

So the next freeze can be pinned down on the phone itself, with no network telemetry:

- Opened by tapping the table code in the header 5 times (or `?debug=1`).
- A small fixed panel (dev-looking, tokens only) listing: link status, `rev`, seconds since the last state frame,
  since the last byte (ping), reconnect count, `clockOffset`, `busy`, whether a sheet is open, `holding`/`dealing`.
- Add counters to `TableLink` (`reconnects`, `lastStateAt`, `lastByteAt`; the last needs an `onByte` hook from
  `followStream`).
- Strings can be plain English in a `debug` group in `strings/play.ts`.

### 3-F (optional) Send `Last-Event-ID` on reconnect

Already in TODO.md ("Reconnecting"). Not needed for the freezes: the server sends the full state on every open. Skip
unless Jay wants it.

---

## 6. Item 4 — Better team names and win/loss lines

Files: `src/games/spades/strings/play.ts` (`team`, `summary`, `winner`, `toast`, `announce`),
`online/table/PlayTable.tsx` (`teamNames` at `:168`, `teamLines`), `online/table/Winner.tsx` (`teamLabel` at
`:79`), `ui/TeamBar.tsx`, `ui/HandSummary.tsx`.

### 4-A ★ Real names

- A team's label becomes the two players' names: your team is **"You & Taha"**, the other **"Sara & Zhsxq"**. Short
  names via `trunc(name, 8)`. Spectators (`me === null`) already see the pair.
- In the team bar, put a tiny caps label above it: "YOUR TEAM" / "RIVALS" (`text-11`/`text-12` caps,
  `text-[var(--tx2)]`), so the colour dot still says which is which.
- Change `teamNames` in `PlayTable.tsx` and `teamLabel` in `Winner.tsx` to build the pair; delete `s.team.us` and
  `s.team.them` if nothing else uses them (grep first).
- **Grammar:** every string that took a team name must read right with a pair ("You & Taha win!" works; "Ten bags:
  You & Taha lose 100" works). Go through `strings/play.ts` and check `made`, `burst`, `won`, `bostonUs`,
  `bostonThem`, `summary.wins`, `winner.title`, `winner.shareText`.
- Tests: `PlayTable.test.tsx` and `Winner` tests that look for "Us"/"Them" text need updating. Also e2e specs: grep
  `e2e/` for `'Us'`, `'Them'`, `Us win`, `Them win`.

### 4-B (optional) A fun team name per table

Each table gets two team names, picked from a list by hashing the table id. Every phone computes the same names,
with no backend change. Names show big; the players' names show small under them.

- New file `src/games/spades/online/table/teamNames.ts`: `teamNamesFor(tableId): { a: string; b: string }` (pure;
  hash the id with a small string hash, pick two different entries). Unit test: stable for one id, a ≠ b.
- The list lives in `strings/play.ts` as `s.teamNames` (strings rule). Starter list (gender-neutral, mix of desi and
  Gen-Z; Jay to trim):
  `Chai Pe Charcha`, `Samosa Squad`, `Masala Mafia`, `Bag Bandits`, `Nil Nation`, `Spade Runners`, `Trick Shot`,
  `No Cap Club`, `Big Ace Energy`, `Jugaad Gang`, `Pakode Pros`, `Late Night Legends`, `The Sure Tricks`,
  `Rizz & Spades`, `Full Paisa Vasool`, `Ace Ventura`, `Kaali Kings`, `Bawaal Boys & Girls`, `Overbid Ops`,
  `Main Character Pair`.
- Rematches keep the names only if the server keeps the table id; it doesn't (`table.next` is a new id), so names
  change each game. Fine for now; note it.

### 4-C (optional) Host names the teams in the lobby

Most work: needs a backend field (team names on the table, set by the host in the lobby, max ~18 characters,
moderated by length only). Write it up in `backend-requests.md` only if Jay picks it. Not specified further here.

### Win/loss copy: pick a deck

`s.winner.title` today: "Us win!" / "Them win!". Replace with lines picked deterministically from the table id
(the same hash as 4-B), so everyone on a team sees the same line. Each deck has lines for **your team won**,
**your team lost**, **draw** and **spectator**. `{w}`/`{l}` = winning/losing pair.

- **Classic:** won "You & Taha win!" · lost "Sara & Zhsxq win this one" · draw "It's a draw" · spectator "{w} win!"
- **Gen-Z:** won "W secured 🏆", "Ate and left no crumbs", "That was a clean sweep, no cap" · lost "Took the L,
  respectfully", "{w} cooked 🔥", "Rematch. Now." · draw "Nobody blinked 🤝"
- **Desi:** won "Kya baat hai! Table aapka 🏆", "Full paisa vasool", "Aaj ki chai unki taraf se ☕" · lost "Koi
  baat nahi, agli baar pakka", "Is baar chai aap pilao ☕", "{w} ne maidaan maar liya" · draw "Barabar ki takkar 🤝"
- **Mixed (decided 2026-11-19): all four decks pooled and picked at random.** Classic, Gen-Z and Desi lines go into one
  pool per outcome (won / lost / draw / spectator). The line is chosen by hashing the table id plus the hand number
  (never `Math.random()` at render), so it looks random from game to game but both phones of a team, and every spectator,
  see the same one. The big title is the picked line; the line under it always says plainly who won and the score
  ("You & Taha won 312–268"), so nobody has to decode slang. Build `ui`-free: a pure `pickLine(pool, seed)` with a unit
  test (same seed → same line; across 200 seeds every deck appears at least once).

Use the same deck for the hand summary verdict when a hand ends (made / set / Boston), e.g. made: "Contract
secured ✅" · set: "Set! That's −80 💀".

### 4-D ★ Your team on the left

`TeamBar` draws `lines` in the order given (team A, then B). In `PlayTable.tsx`, put your own team first when
`me !== null` (`teamLines.sort((x) => (x.mine ? -1 : 1))`, or build them in that order). Check `HandSummary` and
`BoardBody` for the same A-then-B order and apply it there too. Tests: a player on team B sees their team first.

---

## 7. Item 5 — Picking and playing a card

Files: `src/games/spades/ui/Hand.tsx`, `src/games/spades/online/table/PlayTable.tsx`,
`src/games/spades/online/table/Felt.tsx`, `src/games/spades/ui/play.css`, `strings/play.ts` (`hand`, `centre`).

### 5-A ★ Fix: a selected card no longer swallows taps meant for its neighbours (required)

- `Hand.tsx:370`: change `zIndex: lift ? 40 : i + 1` to `zIndex: i + 1`. The lifted card keeps its place in the
  stack. Its left strip and the 24px it rises show it is selected, and the cards to its right stay tappable.
- Keep the accent ring (it now shows on the visible part). Make it slightly stronger so a half-covered lifted card
  still reads as selected: `shadow-[0_0_0_3px_var(--accent),…]`.
- Behaviour after the fix: tap card A → A lifts; tap card B → B lifts, A drops; tap B again → B plays. Drag still
  plays on release past `PLAY_DRAG`.
- Tests: `Hand` unit test (create `ui/Hand.test.tsx`, jsdom): lift card 5, then click card 6 → card 6 is lifted and
  `onPlay` was not called. jsdom has no layout, so also add an e2e check: in `spades-online-hand.spec.ts`, **click with
  the pointer** (not the keyboard) on a card, then on the card to its right, and assert the second is lifted
  (`aria-pressed` — add `aria-pressed={lift}` to the card button for this and for screen readers) and nothing was
  played. Then remove the TODO note about the pointer landing on the next card, if this fixes it.

### 5-B ★ Tap the table to play the selected card

- **Lift state moves up.** `Hand` gets two props, `lifted: string | null` and `onLift: (id: string | null) => void`,
  replacing its internal `useState` (`Hand.tsx:126`). `PlayTable` holds `const [lifted, setLifted] = useState<string |
  null>(null)` and clears it when `playable` turns false (move the existing effect from `Hand` into `PlayTable`).
- **Drop slot.** When `lifted !== null && playable`, render inside `Felt` (as a child) a card-shaped slot where your
  card will land: the bottom position of the trick (`place 0` in `TrickCard`; reuse the same position classes so it
  matches exactly). Style: dashed 2px `var(--accent)` border, `rounded-[11%_/_7.9%]`, a soft accent glow behind it,
  and a slow breathing opacity pulse (`@keyframes sp-slot { 50% { opacity: .55 } }` in `play.css`, `animation: none`
  under reduced motion). Under it a small label "Tap to play" (`s.hand.tapTable`), `text-13 font-bold`.
- **The whole felt is the target.** Also render a transparent full-felt `<button>` above the centre button and the
  trick but **below the seats** (`z-[3]`; seats are drawn later in `Felt`), with
  `aria-label={s.hand.playLifted(cardName(card))}`. On click: find the card's element with
  `root.current.querySelector('[data-card-id="…"]')`, call `onPlay(card, boxOf(el))`, `setLifted(null)`. The card's
  flight from the hand already exists (`pending.from`).
- **Conflict:** today a tap on the felt's centre opens the last trick (`onCentre`). With 5-B that tap must play the
  card while one is lifted. See 6.3: move "last trick" to its own small button so both stay possible.
- Tapping the lifted card again still plays it (already true). Tapping your own hand area outside any card drops the
  selection (add an `onClick` on the hand container that calls `onLift(null)` when `e.target === e.currentTarget`).
- After a lift, `turnText` under the fan says `s.hand.tapAgain` ("Tap again or tap the table to play").
- Tests: `PlayTable.test.tsx`: lift a legal card, click the felt button → `act` called with `{type:'play', card}`.
  Illegal cards never lift (already so), so the slot never shows for them. e2e: lift then tap the felt centre → the
  card is played (check `viewOf` shows it in the trick).

### 5-C (optional setting) Play with one tap

`SpPrefs.oneTap: boolean` (default `false`). When on, the first tap on a legal card plays it. Toggle in `PrefsBody`
under the sort setting, with the line "Faster, but no second chance". Test like the other prefs.

---

## 8. Item 6 — More UX improvements (pick any)

| ID  | What                                                     | Why                                                                                                         | How                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 ★ | Turn line in the centre of the felt                    | The reference's "Bidding in progress – X's turn" is clear; ours shows only the ring on X's avatar.         | `centreText` in `PlayTable.tsx` (`~:862`): when nothing is on the felt and it's not my turn, show `s.centre.bidding(name)` ("Sara is bidding…") or `s.centre.toPlay(name)` ("Taha to lead"). It already renders under the trick. |
| 6.2 ★ | "Your turn" visible over any open sheet                | If you're in the menu or settings when your turn comes, you only get a buzz.                                | When `myTurn && sheet !== null`, show a pill at `z-[70]` (same place as the toast) "Your turn": tapping it closes the sheet. Complements 3-A's auto-close.                                                                          |
| 6.3   | Last trick gets its own button (required with 5-B)     | The centre tap is taken by "tap to play".                                                                   | A 44px chip next to the "♠ locked/broken" chip (`SpadesChip` in `Felt.tsx`) with a "↺" icon and `aria-label={s.centre.lastTrick}`; the `L` key stays. Remove the big invisible centre button, or keep it only when nothing is lifted.  |
| 6.4 ★ | Haptic on lift                                         | Confirms the tap on a crowded fan.                                                                          | `vibrate(5)` (`hooks/useHaptics`) and `sfx('pop', true)` in `Hand`'s lift path.                                                                                                                                                       |
| 6.5   | Auto-play your only legal card (setting, off)          | Saves a tap and the timer.                                                                                  | **Decided: 5 s.** `SpPrefs.autoSingle`; in `PlayTable`, when `playable` and exactly one card is legal, play it after **5 s** unless the user taps (tapping the card or the table plays it sooner). Never on the first trick of a hand. |
| 6.6   | Toast sits over the header title                       | In our screenshot "Time's up: your lowest card was played" covers "Hand 1".                                 | Move `ToastPill` to just below the header (`top-[calc(var(--sat)+3.5rem)]`), clear of the team bar's numbers; check the reconnect pill doesn't collide (same top), stack them.                                                       |
| 6.7   | Bid hint (setting, off)                                | Helps newer players.                                                                                        | A line in the pad: "Your hand: about 3 tricks", from a simple count (aces, protected kings, long spades). Pure function in `ui/` with unit tests. Clearly labelled a hint. Never on for Blind Nil.                                     |

---

## 9. Done checklist (per chosen item)

- [ ] Code, strings in `strings/play.ts`, tokens only, reduced-motion fallback for anything new that moves.
- [ ] Unit tests added as listed; `npm run typecheck && npm run lint && npx vitest run` pass.
- [ ] Spades e2e pass; full `npm run test:e2e` passes once at the end.
- [ ] Looked at on a phone size (390×844) in **all four themes** with the e2e helpers (switch theme via the Me page).
- [ ] `docs/codebase/TODO.md`: remove what's fixed (the e2e pointer-on-fan note if 5-A fixes it); add what's left
      (real-phone check of the freeze fixes, the production-log check for 3-D if not done).
- [ ] `backend-requests.md` written and the backend change built and tested (`make verify`) if 3-D was picked.
- [ ] One commit per concern, Conventional Commits, no co-author trailer, nothing pushed.
- [ ] Generated output deleted (`test-results/`, `playwright-report/`, screenshots). This plan and
      `backend-requests.md` deleted once everything is committed in both repos.




# My Decisions

Spades playtest decisions

1. Bid pad hides the other players’ bids
  1-A “Bids so far” strip inside the pad: YES
  1-B Smaller pad, anchored low: YES
  1-C Hold-to-peek eye button: NO
  1-D Team bar shows running bids: YES

2. Cards are hard to read (suit, red vs red)
  2-A Classic cards in every theme (Spades only): YES
  2-B Bigger, bolder corner index: YES
  2-C Four-colour deck (setting, default off): NO
  2-D Lighter “can’t play” dimming + raise playable cards: YES
  2-E Flatter fan: YES
  2-F Bigger cards on the felt: YES

3. Frozen screens (stale turn, stuck on round scores)
  3-A Close the round summary when the next hand is dealt (+ your turn closes sheets): YES
  3-B Resync when the phone comes back: YES
  3-C Stale-view watchdog: YES
  3-D Backend: keep the newest update when a queue is full: YES
  3-E Debug overlay for the next playtest: NO
  3-F Send Last-Event-ID on reconnect: NO

4. “Us win / Them win” looks bad
  4-A Real names: “You & Taha” vs “Sara & Zhsxq”: YES
  4-B Fun team name per table: NO
  4-C Host names the teams in the lobby: NO
  4-D Your team always on the left: YES
  4-deck-Classic Win/loss copy: Classic: YES
  4-deck-GenZ Win/loss copy: Gen-Z: YES
  4-deck-Desi Win/loss copy: Desi: YES
  4-deck-Mix Win/loss copy: Gen-Z + Desi mix: YES

5. Can’t switch the selected card; want “tap the table to play”
  5-A Fix the overlap so neighbours can be tapped (required): YES
  5-B Tap the table to play the lifted card + glowing drop slot: YES
  5-C “Play with one tap” setting (default off): NO

6. Other improvements I found
  6.1 Turn line in the centre of the felt: YES
  6.2 “Your turn” pill over any open sheet: YES
  6.3 Last-trick button of its own (required with 5-B): YES
  6.4 Haptic + soft sound on lifting a card: YES
  6.5 Auto-play your only legal card (setting, off): CHANGE — keep it after 5s, like play if that is the only playable card
  6.6 Toast no longer covers the “Hand 1” title: NO
  6.7 Bid hint (setting, off): NO
34 of 34 decided

---

## Resolutions of Jay's decisions (2026-11-19)

- **Rejected, do not build:** 1-C, 2-C, 3-E, 3-F, 4-B, 4-C, 5-C, 6.6, 6.7. (4-B off means no fun team names: teams are the
  real pairs, so the optional `teamNames.ts` is not needed; the win/loss pool still hashes the table id.)
- **Approved:** everything else, including 2-E and 2-F and all four win/loss decks.
- **Win/loss copy:** random from Classic + Gen-Z + Desi pooled (see §6). Not a fixed "mix" list.
- **6.5:** approved with a 5 s delay.
- **Backend:** 3-D is approved, so `backend-requests.md` is needed.
- **Order:** as in §1's suggested order, minus the rejected items.
