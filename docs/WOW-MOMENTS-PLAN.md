# Wow moments: the plan (Part D, redone)

Written 2026-11-17 for Jay to approve before any code. A working doc, never committed; deleted when built. It
replaces Part D of `docs/NEXT-SESSION-PLAN.md` (on branch `docs/next-session-plan`). Checked against `main`
(`3fe89e0`) and the feature branch in progress; three read-only inventories covered every animation, sound and haptic
in Spades, Kaali Teeri, Ishaara, Kachuful and the shared kit.

**What you approve:** the moments in §4 (and the cuts in §5), the foundations in §3, and the answers in §9.

---

## 1. What we found (the old Part D was half built, and had some bugs underneath)

**Already built, so the old list double-counted it:**

| Old idea                                   | What already exists                                                                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spades: the table cracks when spades break | Seeded crack lines drawn on the felt, a big ♠, a "Spades broken" banner, the chip pops, `crack` sound, buzz (`Felt.tsx:230-371`)                                                       |
| Spades: bag meter boom                     | Online: the bag row pops, bronze burst, "−100" rises, `burst` sound, buzz 40 (`TeamBar.tsx:63-135`). Scorekeeper: the meter pops and "−100" floats (`table/screens/parts.tsx:139-204`) |
| Spades: set shake                          | The SET card shakes ±7px and a "SET −N" stamp drops, `thud`, buzz (`TeamBar.tsx:162-184`)                                                                                              |
| Kachuful: the hook moment                  | The dealer's key dims to locked over 200ms with its reason; tapping it shakes (`BidKeypad.tsx:36,94-178`)                                                                              |
| Kachuful: everyone made it                 | **Impossible**: the hook rule means someone always misses (`domain/scoring.ts:37-44`). "Everyone but one" already exists                                                               |
| Kachuful: grand slam                       | A small badge card only; it becomes the big unlock card (§4, A1)                                                                                                                       |
| Kaali Teeri: thousand club                 | Nothing, and worse: crossing 1,000 jumps straight to the winner, **skipping the last hand's result** (`reducer.ts:477-486`)                                                            |

**Bugs and costs underneath (fixed first, §3.6):**

1. **Reduced motion hides information.** Spades' `anim()` skips any animation whose opacity starts and ends the same
   (`ui/fx.ts:44-51`). Under reduced motion the "♠ Spades broken" banner and the bag penalty's "−100" **never appear**.
2. **The online Spades table and the Ishaara board re-render 4 times a second** in every timed turn (`useServerNow`
   sets state every 250ms, `online/table/useTimers.ts:4-12`), overlapping every sweep, stamp and reveal.
3. **Count-ups animate `fontWeight` and `letterSpacing`** (`Counter.tsx:46-59`), which re-lays out text every frame;
   up to four run at once on a hand summary.
4. **Animated elements with a 22px backdrop blur** (Sunset Glass `.glass`, `.mat-toast`): the Spades team card's
   shake and pop, toasts, reels, Ishaara's timer pulse. `.mat-toast` also escapes the low-end and reduced-transparency
   resets.
5. **The streak burst** runs 16 emoji particles through Framer's `x/y` shorthands (main thread), under a 30px
   `drop-shadow` on an element that bobs forever (`StreakCelebration.tsx:118-189`).
6. Smaller: the hand flip re-renders 13 times (`Hand.tsx:151-156`); Ishaara's win confetti replays when a finished
   game is reopened (`Win.tsx:73`); confetti has no reduced-motion guard of its own; `BadgePop` is in each shell's
   first load; DESIGN-SYSTEM.md item 15 describes a Kaali Teeri card fan that doesn't exist.

**Gaps that matter:** nothing happens on a Spades **Boston**; Blind Nil looks like a plain Nil; the last Kaali Teeri
partner, the table's biggest reveal, is treated like any other; Ishaara's trap barely registers; sound exists only in
online Spades; iPhones get no haptics (expected: `navigator.vibrate` is Android-only).

---

## 2. The motion language (one grammar, not scattered effects)

Baithak is a card table that one phone or several share. Every moment speaks with the same three materials, which the
app already uses:

- **The card.** Big news is dealt as a card: it drops, turns (rotateY, **450ms**, the trump turn's timing) and is
  read. The unlock card, Boston's stack, the Kaali Teeri reveal.
- **The stamp.** Verdicts stamp: SET (exists), BOSTON, SOLD, TRAPPED, 1000. One shape: scale 1.6 → 1, rotate −8°,
  **360ms** with `POP`, a 3px settle, the verdict's colour token.
- **The light.** Winners get one gold sheen (translateX −110% → 110%, 700–900ms, linear), never a loop.

### 2.1 Three tiers (the gate every moment passes)

| Tier       | How often              | Length                 | May it take the screen?                              | Examples                                                    |
| ---------- | ---------------------- | ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **Tick**   | every play, bid, round | ≤ 300ms                | no; feedback only                                    | bubbles, card flights, sweeps (all exist; **no new ticks**) |
| **Beat**   | a few per game         | 0.8–1.6s               | no; one element on the table, the rest keeps working | SOLD, last-partner spotlight, Blind Nil declared, mind meld |
| **Moment** | rare (a few per night) | ≤ 2.5s (game end ≤ 4s) | yes, as an overlay; **tap anywhere skips**           | Boston, big unlock card, trap, season reveal                |

Rules for all tiers:

- **Never in the way.** No moment delays a server action, a turn timer, or the scorer's next tap. Overlays are
  `pointer-events: none` except their skip layer; a turn timer never runs under a moment (Spades hand end has none;
  mid-hand moments are Beats only).
- **Derived from state, never from a clock.** Each moment is a pure function of two consecutive game states (the
  pattern of Spades' `momentsBetween`), so every online phone and every live viewer plays the same moment from the
  same frame, with no backend change.
- **One at a time.** A moment queue (§3.2) plays at most one Moment at once and at most **two per hand/round**; the
  rest collapse into the hand summary's line.
- **One or two moving things per view.**

### 2.2 Exact values (tokens; extend `components/ui/motion.ts` and `spades/ui/fx.ts`, no parallel sets)

| Token                            | Value                              | Use                                            |
| -------------------------------- | ---------------------------------- | ---------------------------------------------- |
| `EASE` (exists)                  | `cubic-bezier(.32,.72,0,1)`        | sheets, settles                                |
| `OUT` (exists)                   | `cubic-bezier(.22,1,.36,1)`        | every entrance                                 |
| `POP` (exists)                   | `cubic-bezier(.34,1.56,.64,1)`     | landings with momentum: stamps, cards landing  |
| `TRAVEL` (new name for KT's dot) | `cubic-bezier(.65,0,.35,1)`        | something crossing the table: spotlight, stack |
| `SPRING_POP` (exists)            | stiffness 520, damping 24, mass .8 | crowns, rings snapping on                      |
| `FLIP_MS`                        | 450                                | card turns                                     |
| `STAMP_MS`                       | 360                                | stamps                                         |
| `BEAT_HOLD_MS`                   | 900                                | how long a Beat is read                        |
| `MOMENT_MAX_MS`                  | 2500                               | Moment ceiling (game end 4000)                 |

---

## 3. Foundations (built first; everything in §4 stands on them)

### 3.1 One sound-and-haptics layer for every game

- Move Spades' synthesised sounds (`spades/sound/sfx.ts`, Web Audio, no files) to `src/fx/sound.ts`; Spades keeps its
  All / Only mine / Off modes.
- New synthesised sounds (no audio files, no dependency): `chime` (unlock), `womp` (shame), `gavel` (SOLD), `roll`
  (a 600ms drum roll ending on a hit), `glitch` (300ms static), `boom` (Boston), `heartbeat` (one beat). Each ≤ 0.8s,
  master gain 0.55 as today.
- **One platform setting**, "Sounds and vibration", on Account/Me: Sounds All / Big moments / Off (default **Big
  moments**: only Moments make sound, so a table isn't beeping all night); Vibration On / Off (default On).
  Spades' own setting stays and wins inside Spades.
- Haptics take patterns: `vibrate([12, 40, 18])` for an unlock, `[30]` for a stamp, `[40, 30, 60]` for Boston. They
  ignore reduced motion (vibration isn't motion) but respect the setting. iPhone: nothing, by design; no moment
  depends on it.

### 3.2 The moment queue

`src/fx/moments.tsx`: each screen pushes `{ id, tier, priority, play, reduced, sound, haptic }`. It plays one Moment
at a time (priority: game end > Boston/trap > big unlock > small unlock), caps two Moments per hand/round, drops
duplicates by id (so a re-render or a reconnect never replays), and exposes `skip()` for the tap layer. Kachuful's
existing caps (two streak bursts a round, `reducer.ts:56-75`) move onto it unchanged. Moments are lazy chunks loaded
when the game screen is idle (`whenIdle`, as the streak burst is today).

### 3.3 Reduced motion: fewer and gentler, never less information

Every moment has a still version that keeps its words and its result: the stamp appears in place (opacity 160ms),
the card appears face up, rings appear without scaling, no confetti, no shake, no flash. Fix `anim()` so an
opacity-in-and-out animation becomes "show for its hold time, then hide" instead of nothing.

### 3.4 Performance rules (checked in review and by the lab, §3.5)

- `transform` and `opacity` only (`clip-path` for reveals is the one exception, as `InkFill` does).
- **Fire-and-forget moments use WAAPI or CSS** (they play while the table is busy and survive a busy main thread);
  Framer only for interactive or spring-driven parts, with transform strings rather than `x/y` shorthands in moments.
- **Never transform a `.glass` element for more than 300ms**; moments render on solid token surfaces. `.mat-toast`
  joins the `data-lite` and reduced-transparency resets.
- No per-frame React state; confetti steps by elapsed time (it already does); at most one confetti canvas at a time,
  ≤ 300 pieces (≤ 80 for a Beat-sized burst); `will-change` only where a 1px shift is seen.
- Lazy: no moment adds a byte to any first load (the budget is already over). Each game's moments are one lazy chunk
  ≤ 30 KB gzip.

### 3.5 A moments lab (dev only)

`/?lab=moments` (stripped from production builds): every moment with Replay, 0.25× speed (WAAPI `playbackRate` and
Framer's global time scale), reduced motion on/off, all four themes, phone and desk sizes. It is where you approve the
feel, and where e2e screenshots each moment's key frame.

### 3.6 Fix first

1. `anim()` reduced-motion bug (Spades banner and "−100").
2. The 250ms re-render: the countdown becomes a leaf component (or a CSS animation keyed to the deadline), so the
   table and board stop re-rendering.
3. The streak burst: particles through WAAPI transforms, the drop-shadow static, the bob stops after two cycles.
4. Glass under motion (rule above), the hand flip by CSS `animation-delay`, Ishaara's confetti on fresh games only,
   the confetti reduced-motion guard, `BadgePop` lazy, DESIGN-SYSTEM.md items 5 and 15 corrected.
5. Count-ups: **your call (§9.3)**. The weight swell is a documented design choice, so it stays unless you say;
   I recommend keeping it on single hero numbers and swelling rows by `scale` instead.

---

## 4. The moments (what passed the gate)

Ordered by impact for effort. "Where" names the component that mounts it.

### Platform

**A1. The unlock card** (Moment for `big` achievements, Beat for the rest; replaces `BadgePop`; needs the
achievements work merged)

- Where: the moment queue, fed by each game's live moments (the progression kit). Shared screen: plays over the
  table; online: on the earner's phone, a compact version on the others.
- Big: the card drops from above (translateY −120% → 0, rotate −8° → 0, 420ms `OUT`), turns (rotateY 180° → 0,
  `FLIP_MS`, its back is the theme's card back), one gold sheen (800ms linear, starting at 900ms), an 80-piece
  confetti from the card in theme colours, `chime`, haptic `[12,40,18]`. Read for 1.4s, then it shrinks
  (scale 1 → .3, 380ms `TRAVEL`) into the earner's seat on the table, or fades up if the seat isn't on screen.
  Total ≤ 2.5s.
- Small: a compact card slides down under the top bar (translateY −100% → 0, 320ms `OUT`), stacked up to three
  ("+2 more"), each read 2.2s; no confetti, no sound unless Sounds = All.
- Shame (🙃): turns to a dull silver face (the `--medal-silver-lo` token), wobbles once (rotate ±3°, 2 cycles,
  360ms), `womp`. No confetti, never a big card.
- Reduced: the card face up in place, fades in and out; the sound and haptic stay.
- Tap: skip. No long-press (hidden on a shared phone and fights iOS text selection); sharing lives on the
  Achievements page.

**A2. The podium reveal, on every podium** (Jay, 2026-11-17: the season reveal's look everywhere a podium shows)

One shared reveal replaces today's two (`Podium.tsx` on winner screens, `RankBoard.tsx` on boards), in two lengths so
boards checked several times a night stay quick:

- **Ceremony** (Moment; rare): every game's **winner screen** and the **season close** (each game's leaderboard, the
  first visit after a month closes; once per season per device, remembered in `persistence.ts`, with "Replay the
  reveal" on the season page). The title inks in (`InkFill`, 700ms: the winner's line, or "Season · November"); the
  steps rise 3rd → 2nd → 1st (260ms apart, 500ms `OUT`, players landing on them); a soft spotlight (a radial-gradient
  layer, translateX across the podium, 900ms `TRAVEL`) lands on 1st; the crown drops on the winner (500ms
  `SPRING_POP`); confetti from the winner. Then the screen as today. ≤ 4s, tap skips. Kaali Teeri's winner gets it
  too (that replaces K4's staged-podium item).
- **Board** (Beat): **every leaderboard**, only on the first board of a visit (today's rule in `RankBoard.tsx`). The
  same rise, spotlight (600ms) and crown, no title, about 2s. Confetti only when it's news: the signed-in player has
  just taken #1 (today's `baithak.boardTop` rule). A filter or range change swaps the podium in place, never
  replays.
- Reduced: everything in place, the title and crown fade in.
- Built once in `components/ui` (one component and one timing file, extending `podiumReveal.ts`), so every game and
  every board uses it.

**A3. Emoji rain** (Beat; online Spades)

- When 3 or more different players send the same reaction within 2s, every phone (they all receive the same
  reactions) plays a rain: 24 copies falling (translateY −10vh → 110vh, 1.6s linear, random x and 0–400ms delays),
  `pointer-events: none`, behind the hand. Client-only, no backend change. Reduced: one large emoji fades in and out.

**A4. MVP of the night** (no new motion)

- One more card in the existing end-of-game reel: the stat the player owned that game (best bid accuracy, most Nils,
  best clue-giver), with a one-line caption. Content, not choreography.

### Spades

**S1. Boston** (Moment; rare; nothing exists today)

- Online, where: a new `boston` stage between `stamps` and `summary` in `PlayTable.tsx` (§ stage machine at
  `:193-206, :459-471`). It delays only the summary sheet; no timer runs at hand end.
- The 13 tricks come back out of the two partners' avatars as small card backs (reusing the deal's flyer code in
  reverse, 30ms apart, 360ms each, `TRAVEL`) into one stack in the felt's centre; the stack's team glow fades in
  (opacity); "BOSTON" stamps on it (the stamp, team colour, layered **above** the stack and the confetti so the word
  is never hidden by the cards; the preview showed it behind them); team-coloured confetti from the stack; `boom`, haptic
  `[40,30,60]` on the team's phones. The other team's phones play the same scene with a quieter caption,
  "Bostoned". ≤ 2.4s, tap skips. Then the summary opens as usual.
- Scorekeeper: on the hand Summary when a team has 13: the stamp and confetti only (no stack; there are no trick
  piles there).
- Reduced: the stamp in place and the caption.

**S2. Blind Nil declared** (Beat; occasional)

- When a seat declares Blind Nil: one gold sheen across that player's face-down hand (their phone) and a second, outer
  ring on their seat for the hand (static, distinct from a Nil's single halo, on every phone). A soft `heartbeat`
  once. No continuous shimmer or heartbeat (it would sit on the hand for 13 tricks).

**S3. The last trick decides it** (Beat; when it does)

- If the hand's result depends on the 13th trick (a contract one short, or a Nil still alive), the last card's flight
  runs at 1.5× its length, the trick holds 400ms longer before the sweep, and a caption reads "Last trick decides
  it". At hand end, so it never eats a turn timer.

**S4. Crack, finished** (upgrade of what exists)

- The felt (not the hand) shakes once: translateX 3px, two cycles, 200ms. The ♠ chip breaks into the eight shards the
  Nil halo already uses. The reduced-motion banner bug is fixed (§3.6).

### Kaali Teeri

**K1. The last partner** (Beat on the shared phone; once per hand)

- Only the last called card gets it (earlier ones keep today's colour run and badge, since several per hand would
  exhaust the table).
- The table dims (a 0 → .45 opacity overlay, 200ms), a soft spotlight (radial gradient) travels from the bidder to
  the partner (translate, 700ms `TRAVEL`), a ring in the bidding colour snaps on (`SPRING_POP`), and "Arjun is with
  Riya!" inks in (`InkFill`, 500ms). `roll` then a hit. ≤ 1.6s; the scorer can keep tapping throughout
  (`pointer-events: none`).
- Reduced: the ring and the line appear.

**K2. SOLD** (Beat; once per hand, so kept small)

- The existing landing of the won bid on the Call screen (`useLand('bid')`, `reveal.tsx:21-36`) gains a small "SOLD"
  stamp above the amount (the stamp, 360ms) and `gavel`. No gavel artwork, no extra wait.

**K3. Reaching 1,000** (Beat, plus a fix)

- Fix: a game won by reaching 1,000 first shows the last hand's summary, then the winner (today the summary is
  skipped).
- In that summary, when a total crosses 1,000 during its count-up, the number turns gold and "1000" stamps beside it.

**K4. The winner** (now part of A2)

- Kaali Teeri's winner screen gets the shared ceremony podium reveal (A2); today its steps just rise and its confetti
  starts from a default point.

### Ishaara

**I1. Trapped** (Moment; at most once a game, and it ends the game)

- The trap card turns; the board jitters (translate 3px in 4 steps, 240ms, `steps(4)`); one red flash (a danger-token
  overlay, opacity 0 → .3 → 0, 200ms; a single flash, well under photosensitivity limits); "TRAPPED" stamps on the
  card; `glitch`. Then today's end note. Reduced: the stamp and the note.

**I2. Mind meld** (Beat; a few per game)

- When a clue for 3 or more is fully found, the found cards pulse in the order they were found (scale 1 → 1.06 → 1,
  80ms apart, 260ms each, `OUT`) and the existing moment note says "Mind meld". No connecting line (an animated SVG
  stroke repaints every frame on the board everyone is reading).

**I3. Photo finish** (Beat; when it happens)

- When both teams need exactly one card, a "Next card wins" banner settles under the clue (320ms `OUT`) and one
  `heartbeat` plays. It stays as a static state line until the turn ends.

---

## 5. Cut, and why (the filter at work)

| Idea                                         | Why not                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VS intro** at game start                   | Plays several times a night and delays the start of play. The rivalry line ("Riya 12–11 Arjun") belongs to the identity work (old D4) as static text |
| **Partner high-five** (Spades)               | Needs a new shared action and a rules change; hidden gesture; low discoverability                                                                    |
| **Rematch handshake**                        | Rematch is host-only today; a per-player opt-in is a product change, not a moment                                                                    |
| **Cold-streak frost** on Kachuful rows       | Persistent decoration on the scoreboard people are reading                                                                                           |
| **On-fire chip / streak marks** everywhere   | Constant motion on every avatar; static marks belong to the identity work                                                                            |
| **Overtake moment** on leaderboards          | Boards already slide rows to new ranks; Kachuful's round summary already does the overtake                                                           |
| **Clue-giver thinking aura**                 | Needs a new presence event from the clue phone (backend)                                                                                             |
| **Suspense meter** (Kaali Teeri)             | Information, not a moment; the header already counts what's revealed                                                                                 |
| **Bag boom, set shake, hook moment**         | Already built (§1)                                                                                                                                   |
| **Everyone made it** (Kachuful)              | Impossible under the hook rule                                                                                                                       |
| **Continuous Blind Nil shimmer / heartbeat** | Motion and sound on the hand for 13 tricks                                                                                                           |
| **Shuffle pull-to-refresh**                  | Adds a gesture to frequently used lists; the loader exists                                                                                           |
| **App icon badge, daily recap story**        | Not motion; they belong with notifications and with awards for every game respectively (later plans)                                                 |
| **Long-press to share an unlock**            | Hidden on a shared phone; conflicts with iOS text selection                                                                                          |

---

## 6. Build order (for the % reports)

Starts **after the achievements work is merged** (A1 and A2 need it, and both touch the Spades table and the shared
kit).

| #   | Phase                                                                                                        | Weight |
| --- | ------------------------------------------------------------------------------------------------------------ | -----: |
| M0  | Foundations: sound + haptics layer and setting, motion tokens, moment queue, moments lab, the §3.6 fixes 1–4 |    20% |
| M1  | A1 the unlock card (every game), replacing `BadgePop`                                                        |    15% |
| M2  | Spades: S1 Boston, S2 Blind Nil, S3 last trick, S4 crack                                                     |    15% |
| M3  | Kaali Teeri: K1–K4                                                                                           |    13% |
| M4  | Ishaara: I1–I3                                                                                               |    10% |
| M5  | A2 the podium reveal on every podium: winner screens, leaderboards, season close (every game)                |    10% |
| M6  | A3 emoji rain, A4 MVP card                                                                                   |     5% |
| M7  | Count-up decision, DESIGN-SYSTEM.md Motion updated, e2e, real-device check, budget check                     |    12% |

M2, M3 and M4 touch separate game folders, so they run as three parallel agents once M0 and M1 are in.

## 7. Done means

- Every moment in the lab with its still version; your sign-off on feel at 1× and 0.25×.
- Unit tests for every trigger (pure: the two states in, the moment out, including "no moment" cases and no replay on
  reconnect); an e2e per moment with `reducedMotion: 'no-preference'` that sees it appear and get out of the way, and
  one with reduced motion that sees its words.
- All four themes; phone (320–430px) and desk; `npm run perf:budget` no worse than before.
- A DevTools performance recording of Boston, the unlock card and the trap on a mid-range Android phone (no long
  frames over 50ms during the moment), and a look on an iPhone. If I can't run a real device, I'll say so and hand you
  the checklist.
- `DESIGN-SYSTEM.md` Motion updated with the grammar, the tiers and the tokens, so the next game reuses them.

## 8. Risks

- **Feel can't be judged from code.** That's what the lab and your 0.25× review are for.
- **Shared-screen sound at a party** can annoy; hence the "Big moments" default and one obvious setting.
- **Online sync:** moments come from the same state frame on every phone, so they play together, but a phone that
  reconnects mid-moment skips it rather than replaying (the queue's id rule).
- **Bundle:** each game's moments are lazy; the first load must not grow.

## 9. Questions for you

**Answered (Jay, 2026-11-17, after reviewing `motion-preview.html`):** the moments and the preview are approved, with
two changes, both made above: Boston's stamp sits above the stack (S1), and the season reveal's look becomes the podium
reveal on every podium, in a ceremony and a board length (A2). Jay then asked for the plan to be completed, so 2 to 5
take the recommendations: sounds default to "Big moments"; count-ups keep the weight swell on single hero numbers and
use a `scale` swell on summary rows; roast lines are left out (never approved); M0 starts in its own worktree while the
achievements work finishes, and M1 onward build on the merged achievements.

1. ~~Approve the moments in §4 and the cuts in §5?~~ Approved.
2. **Sounds for the shared-phone games** (Kachuful, Kaali Teeri, Ishaara's table): default "Big moments" (recommended),
   "All", or "Off"?
3. **Count-ups:** keep the weight swell everywhere (today), or keep it on single hero numbers and use a `scale` swell on
   summary rows for smoothness (recommended)?
4. **Roast lines** (kind, stat-based one-liners on the summary and winner screen, e.g. "Dev bid 0 six times and still got
   set"): in or out?
5. Build after the achievements merge (recommended), with M2–M4 as parallel agents?
