# Sound plan: Kachuful and Kaali Teeri

Written 2026-11-18 for Jay. A working doc (never committed; delete once it ships). Everything it says about the code
was checked against `main` (`d7a2e1d`). Frontend only; **no backend change, no new dependency, no audio files**.

**Status: waiting for approval (§11).** Nothing is built yet.

---

## 1. Where we are

- **Engine:** [src/fx/sound.ts](../src/fx/sound.ts) synthesises 19 sounds with Web Audio. Each has a **tier** (`moment`,
  `beat` or `tick`).
  - `cue(name, tier?)` plays a sound under the platform setting.
  - `sfx()` is Spades' own path, with its own mode.
  - Audio unlocks on the first tap (`armAudio`), and it's silent while the page is hidden.
- **Setting:** "Sounds and vibration" on the Me page ([FxSettings.tsx](../src/platform/pages/FxSettings.tsx), key
  `baithak.fx`). The choices are **All / Big moments / Off**, and the default is **Big moments**, which plays only the
  `moment` tier. Vibration is a separate switch that `vibrate()` already respects.
- **Kachuful:** no sound of its own. Only the shared achievement pop makes a sound: a chime or womp, and the small
  cards' chime plays only on "All".
- **Kaali Teeri:** two sounds of its own, both `beat` tier, so **silent by default**:
  - `gavel` on the SOLD stamp ([Call.tsx:26](../src/games/kaali-teeri/screens/hand/Call.tsx#L26)).
  - `roll` on the last partner ([lastPartner.tsx:79](../src/games/kaali-teeri/screens/hand/parts/lastPartner.tsx#L79)).
- **Haptics:** every haptic in both games is the same 10ms tap. The hook, a new leader, the winner and an error all
  feel the same.

So by default both games are effectively mute, and on "All" there's still almost nothing.

## 2. What the sound should feel like

**Table sounds, not arcade sounds.** Everything should sound like the room:

- cards: riffle, flick, slap
- wood: the table, the gavel
- a cup set down
- a small brass bell
- a dhol only for the winner

That means short, warm and mostly low-mid, with **no** beeps, lasers or synth fanfares. It's a phone on a table among
friends talking, so sounds sit **under** the conversation.

**Rules:**

1. **The tier decides who hears it.**

   | Tier       | Heard on                | What it is for                     | Budget                          |
   | ---------- | ----------------------- | ---------------------------------- | ------------------------------- |
   | **moment** | Big moments (default) and All | game-defining beats         | **at most 1 per round or hand** on average, plus the game end |
   | **beat**   | All                     | the story of each round            | a few per round                 |
   | **tick**   | All                     | taps and small confirmations       | very quiet, under 0.1s          |

2. **Sound follows the state, not the animation.** Under reduced motion the animations are skipped, but the sound
   still plays once at the state change; sound isn't motion. Staggered sequences (6 players landing one by one)
   collapse to a single sound under reduced motion.
3. **One clock.** A sound inside an animated sequence is scheduled from the **same timing constants** as the animation
   (`LAND_GAP`, `podiumReveal`, the deal's `gap`), so they can't drift apart. A tap skips the animation and its pending
   sounds together.
4. **Never stacks.** The same sound plays at most once every 60ms, at most 4 voices at a time, and a `moment` ducks
   whatever else is playing.
5. **Phone and large screen alike.** The calls live in the shared stage hooks and store actions, not in phone-only
   components, so the desk layouts (`BidPane`, `ResultsPane`, `DeskSummary`, `DeskWinner`, `KtWorkspace`) get them
   for free.
6. **Lazy.** Both games call through `import('@/fx/sound')` (as `fx/moments.tsx` does), so the first load doesn't grow.
   The new recipes add about 1–2 KB to the lazy sound chunk.

## 3. New sounds (synthesised, added to `fx/sound.ts`)

Each is under 0.8s (the fanfare under 1.6s), built from the existing `noise()` and `tone()` helpers.

| Name      | Tier   | Sounds like                                                                        | Used for                                                     |
| --------- | ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `flick`   | tick   | a card flicked onto felt (short bright noise, slight pitch drop)                   | a bid entered, a partner card picked                         |
| `chip`    | tick   | a clay chip set on wood; **pitch is a parameter**                                  | Kaali Teeri raises (pitch climbs with the bid)               |
| `knock`   | tick   | two soft knuckle knocks on wood                                                    | pass; a disabled or forbidden key                            |
| `hook`    | beat   | a reel's quick zip down, then a low pluck (Kachuful's signature)                   | the hook catches the dealer                                  |
| `made`    | beat   | a bright two-note pluck, up; **pitch parameter**                                   | a made result landing in the reveal                          |
| `missed`  | beat   | a soft low thunk, down; **pitch parameter**                                        | a missed result landing                                      |
| `tally`   | beat   | a short rattle of coins (0.4s)                                                     | the count-up of totals                                       |
| `rise`    | beat   | a quick airy whoosh up                                                             | an overtake in the comeback climb                            |
| `crown`   | beat   | a small brass bell with a shimmer                                                  | a new leader                                                 |
| `bell`    | moment | a temple bell, single strike, long tail                                            | "Last round" / "1000 reached": the final stretch             |
| `spin`    | tick   | a ratchet that slows (ticks spaced out)                                            | the dealer spin in setup                                     |
| `undo`    | tick   | a short reverse swish                                                              | undo                                                         |
| `fanfare` | moment | **dhol**: dha-dhin-dhin-dha on low toms, then a rising triad on a bright reed tone | the winner                                                   |

Existing sounds reused: `riffle`, `deal`, `gavel`, `roll`, `thud`, `chime`, `womp`, `boom`, `pop`, `err`.

**Pitch parameter:** `cue(name, tier?, { pitch })` adds an optional semitone offset. For example, made results in a
reveal step up a scale (do, re, mi…), so a table where everyone made it sounds like a little tune, and a missed one
drops. It's the cheapest delight in this plan.

The `fanfare` is later the default **Jashn** (win celebration) in the rewards plan; the rewards plan's dhol roll,
patakha and baraat become variants of it.

## 4. Kachuful: the full map

The labels in the When column (stage 1, step k and so on) are the code's animation stages, as found in the files
listed.

### 4.1 Setup

| Event                         | Where                                   | Sound                                       | Tier | Haptic     | Reduced motion          |
| ----------------------------- | --------------------------------------- | ------------------------------------------- | ---- | ---------- | ----------------------- |
| Seat tap, add/remove, reorder | `setup/Step1.tsx:94`, `Step3.tsx:115,125,237` | `pop`                                 | tick | 10 (as now) | same                   |
| Dealer spin                   | `Step3.tsx:65` (effect)                 | `spin` slowing with the laps, then `pop` on the dealer | tick | 10 on land | one `pop` at the 600ms hold |
| Begin game                    | `Step3.tsx:139` → `beginGame`           | `riffle`                                    | beat | `[12,40,18]` | same                  |

### 4.2 The deal (each round, `round/RoundStart.tsx`)

| When                                 | Sound                                          | Tier   | Reduced motion           |
| ------------------------------------ | ---------------------------------------------- | ------ | ------------------------ |
| Stage 0, the trump card lifts and turns (`liftAt`, `+LIFT`) | `flick` on the turn         | tick   | skipped                  |
| Stage 1, the dealer chip passes      | `pop`                                          | tick   | skipped                  |
| Stage 2, card k flies (`k*gap`)      | `deal` per card; on the last round each card is slower and a tone lower | tick | skipped |
| Stage 3, **last round** title        | `bell` (once a game)                           | moment | `bell` at stage 3 (reduced motion starts there) |
| "Peak round" / "Back to 3" banner    | `chime`                                        | beat   | same                     |
| A tap skips                          | cancels the pending deal ticks                 | —      | —                        |

### 4.3 Bidding (`round/Turn.tsx`, desk `BidPane.tsx`)

| Event                                         | Where                       | Sound                                                       | Tier | Haptic        |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------------- | ---- | ------------- |
| Bid number tapped (chip flies to the seat)    | `Turn.tsx:75`, `store.tsx:323` | `flick` when the `BidFlight` chip **lands**              | tick | 10            |
| Forbidden number tapped (the key shakes)      | `Turn.tsx:76-82`, desk `Workspace.tsx:79` | `knock`                                       | tick | `[8,30,8]`    |
| **Hook catches the dealer** (bid removed, `hookWarn`) | `reducer.ts:174-178` (state) | **`hook`**                                       | beat | `[20,40,20]`  |
| All bids in, "Start playing"                  | `Turn.tsx:241-245`          | `riffle` (short)                                            | tick | 10            |

### 4.4 Results (`round/Results.tsx`, desk `ResultsPane.tsx`)

| Event                                       | Where                      | Sound                                | Tier | Haptic |
| ------------------------------------------- | -------------------------- | ------------------------------------ | ---- | ------ |
| Made / missed toggle                        | `Results.tsx:142`          | `made` / `missed` at their base pitch, quiet | tick | 10 |
| The last result is filled in automatically  | `Results.tsx:70`           | `pop`                                | tick | —      |
| Confirm round                               | `Results.tsx:53`           | `thud` (soft)                        | tick | 10     |

### 4.5 The score reveal (`round/Summary.tsx` `useSumStages`, desk `DeskSummary.tsx`), the heart of it

| Stage                                            | Sound                                                                                   | Tier   | Haptic         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------ | -------------- |
| Stage 1, deltas land one by one (`LAND_GAP` 60ms) | per player: `made` stepping up a pentatonic scale, or `missed` stepping down             | beat   | —              |
| Stage 1, **everyone made it**                    | `chime` after the run                                                                    | beat   | —              |
| Stage 1, a sole miss (`Summary.tsx:107`)         | `womp` after the run                                                                     | beat   | —              |
| Stage 2, Counter count-up                        | `tally`                                                                                  | beat   | —              |
| Comeback climb (`CLIMB_STEP` 170ms per step)     | `rise` per step, pitch up                                                                | beat   | —              |
| Stage 4, **new leader**: crown drop and shine    | `crown`                                                                                  | beat   | `[12,40,18]`   |
| A tap skips                                      | the remaining reveal sounds are dropped; only the final state's one sound plays (crown if a new leader, else nothing) | — | — |
| Reduced motion                                   | one sound: `chime` (all made), `womp` (sole miss) or `crown` (new leader), at the `REDUCED_T` land time | beat | as above |

### 4.6 Streaks, achievements, undo

| Event                                                   | Sound                                                       | Tier                     | Haptic                           |
| ------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | -------------------------------- |
| Streak burst (`StreakCelebration.tsx:129`)              | `chime`; for the top streak tier, `chime` + `boom`          | beat; top tier **moment** | as now (`20`/`40`)              |
| Achievement pops                                        | as now (the `MomentPop` chime/womp)                         | as now                   | as now                           |
| Undo (`store.tsx:346`)                                  | `undo`                                                      | tick                     | 10                               |
| Nothing to undo / blocked option                        | `err`                                                       | tick                     | `[8,30,8]`                       |

### 4.7 The winner (`screens/Winner.tsx` `useReveal`, `podiumReveal.ts`, desk `DeskWinner.tsx`)

| When (from the same `revealPlan`)          | Sound                                          | Tier   | Haptic             |
| ------------------------------------------ | ---------------------------------------------- | ------ | ------------------ |
| 3rd lands                                  | `thud` (soft)                                  | beat   | 10                 |
| 2nd lands                                  | `thud`, a little louder                        | beat   | 10                 |
| Build-up before 1st                        | `roll` (the drum roll, timed to end on the land) | beat | —                  |
| **1st lands**, crown drops, confetti       | **`fanfare`**                                  | moment | `[12,40,18,40,30]` |
| The name is written (`NAME_MS`)            | —                                              | —      | —                  |
| Reduced motion (static podium)             | `fanfare` once, on mount                       | moment | same               |
| Rematch                                    | `riffle`                                       | beat   | 10                 |

### 4.8 The live page (spectators, `screens/pages/LivePage.tsx`)

Spectators are on their own phones, so the same setting applies on their device.

| Event                              | Sound                      | Tier   |
| ---------------------------------- | -------------------------- | ------ |
| A round lands (new state over SSE) | the reveal's one-sound summary (chime / womp / crown) | beat |
| A reaction burst arrives           | `pop`                      | tick   |
| Their prediction scored right      | `chime`                    | beat   |
| Game finished                      | `fanfare`                  | moment |

### 4.9 Leaderboard podium (`ui/RankBoard.tsx` `revealPlan`, `BOARD_GAP_MS`)

The 3rd, 2nd and 1st places land with soft `thud`s, and 1st gets `crown`. All are beat tier and play only the first
time a board's top is shown (the existing `saveBoardTop` rule). This is shared, so every game's board gets it.

### 4.10 What Kachuful sounds like by default (Big moments)

- **Each round:** silence, except the hook (when it bites) on "All".
- **The last round's** `bell`.
- **The winner's** `fanfare`.
- **Big achievements and top streaks.**

That's about 3–5 sounds a whole game, which is right for a shared phone. Everything else needs **All**.

## 5. Kaali Teeri: the full map

### 5.1 Setup and the deal

| Event                                       | Where                                   | Sound                                   | Tier | Haptic       | Reduced motion          |
| ------------------------------------------- | --------------------------------------- | --------------------------------------- | ---- | ------------ | ----------------------- |
| Player count ±, dealer pick, seat drag      | `setup/Players.tsx:100`, `Dealer.tsx:41,75` | `pop`                               | tick | 10           | same                    |
| Random dealer                               | `Dealer.tsx:42`                         | `spin`, then `pop`                      | tick | 10           | `pop`                   |
| Start game                                  | `Dealer.tsx:49`                         | `riffle`                                | beat | `[12,40,18]` | same                    |
| The deal (stages 520 / 650 / `dealMs`)      | `setup/Deal.tsx:31-37`                  | `riffle` at the start, `deal` ticks across `dealMs` | tick | — | not rendered; nothing |

### 5.2 The auction (`hand/bidding/Auction.tsx`, `BidTable.tsx`, `QuickBid.tsx`)

| Event                                     | Where                          | Sound                                                                                     | Tier   | Haptic        |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- | ------ | ------------- |
| **Raise**                                 | `Auction.tsx:89`               | `chip`, **pitch rising with the amount** (150 low → 250+ high), so the room hears the auction heat up | tick | 10 |
| Raise to the game's top bid               | same                           | `chip` + `crown` shimmer                                                                  | beat   | `[12,40,18]`  |
| Pass                                      | `Auction.tsx:84`               | `knock`                                                                                   | tick   | 10            |
| Forced take                               | `Auction.tsx:63`               | `knock` then `chip`                                                                       | tick   | 10            |
| Auction won: "X won at N" banner          | `reducer.ts:396` (state)       | — (the gavel follows on Call)                                                             | —      | —             |
| Quick mode: winner picked                 | `QuickBid.tsx:48`              | `chip` at the bid's pitch                                                                 | tick   | 10            |

### 5.3 The call (`hand/Call.tsx`, `call/CardGrid.tsx`)

| Event                                        | Sound                                               | Tier                 | Haptic        |
| -------------------------------------------- | --------------------------------------------------- | -------------------- | ------------- |
| **SOLD stamp**                               | `gavel` (exists, moved into the Moment queue so it gets priority and a haptic) | **moment** (was beat) | `[20,40,20]` |
| Trump picked (blooms on Play)                | `flick` + a low tone in the suit's register         | tick                 | 10            |
| Partner card picked / removed                | `flick` / `undo`                                    | tick                 | 10 / —        |
| Confirm call                                 | `riffle` (short)                                    | tick                 | 10            |

The gavel becomes Kaali Teeri's **one default sound per hand**. It's the moment the whole table looks up, and it's
already built.

### 5.4 Play: partner reveals (`sheets/PlayedBy.tsx`, `parts/reveal.tsx`, `lastPartner.tsx`)

| Event                                             | Sound                                       | Tier | Haptic  | Reduced motion            |
| ------------------------------------------------- | ------------------------------------------- | ---- | ------- | ------------------------- |
| Partner card flips (`markPlayed`)                 | `flick`                                     | tick | 10      | same (cross-fade)         |
| The dot flies card → seat, lands (`FLIP_S+FLY_S`) | `pop` on landing, pitched to the partner's index | tick | —   | `pop` at once             |
| **Last partner** spotlight                        | `roll` (exists)                             | beat | `[12,40,18]` | as now (`reduced` path) |

### 5.5 Result and summary (`hand/Result.tsx`, `hand/Summary.tsx`)

| Event                                                       | Sound                                          | Tier   | Haptic         | Reduced motion (`fresh` is false) |
| ----------------------------------------------------------- | ---------------------------------------------- | ------ | -------------- | --------------------------------- |
| Verdict shown: **made** (stamps)                            | `made` + `thud`                                | beat   | `[12,40,18]`   | played once on confirm            |
| Verdict shown: **failed** (tilts)                           | `womp`                                         | beat   | `[20,60,20]`   | same                              |
| Confirm hand                                                | `thud` (soft)                                  | tick   | 10             | same                              |
| Sweep beat (900ms announcement)                             | `boom` (small)                                 | beat   | `[12,40,18]`   | `boom` at confirm                 |
| Delta chips pop (stage 1)                                   | `made`/`missed` per player, stepping           | beat   | —              | skipped                           |
| Counter count-up (stage 2)                                  | `tally`                                        | beat   | —              | skipped                           |
| Rank reorder; a new leader                                  | `crown`                                        | beat   | `[12,40,18]`   | `crown` at confirm                |
| **"1000" stamp** (someone crosses the line)                 | `bell`                                         | moment | `[20,40,20]`   | `bell` at confirm                 |
| Moment cards, achievements                                  | as now                                         | as now | as now         | as now                            |
| Undo / nothing to undo                                      | `undo` / `err`                                 | tick   | 10 / `[8,30,8]` | same                             |

Because the summary's stage timers don't run under reduced motion, the reduced path fires its sounds from **confirm
hand**, not from the stages (§2, rule 2).

### 5.6 The winner (`screens/Winner.tsx`)

The same as Kachuful §4.7, from the shared `podiumReveal`: `thud`, `thud`, `roll`, then **`fanfare`** on 1st, and
`fanfare` once under reduced motion. The winner reel's achievement cards keep their own sounds.

### 5.7 The live and recap viewer (`screens/viewer/Viewer.tsx`)

Like Kachuful's live page:

- a hand lands: the one-sound summary (beat)
- a new leader: `crown`
- game finished: `fanfare`

### 5.8 What Kaali Teeri sounds like by default (Big moments)

- **Each hand:** the gavel on SOLD.
- **The 1000 bell.**
- **The winner's fanfare.**
- **Big achievements.**

## 6. Engine changes (`src/fx/`)

1. **`sound.ts`:**
   - the 13 new recipes
   - `cue(name, tier?, { pitch?, gain? })`
   - the limiter (once per 60ms per sound, max 4 voices, and a `moment` ducks the rest by 50% for its length)
   - `gavel`'s tier moves to `moment` (only Kaali Teeri uses it; Spades' `sfx` path ignores tiers)
2. **`fx/sequence.ts`** (new): `scheduleCues(plan, { reduced, onSkip })` takes the same plan objects the animations use
   (`revealPlan`, `useSumStages`' stage times, the deal's `k*gap`) and returns a cancel function. A tap-to-skip
   cancels it, and unmount cancels it. Reduced motion collapses it to its `reducedCue`.
3. **`fx/feedback.ts`** (new): `feedback(kind)` for taps, with a small table of `kind → { sound, tier, haptic }` (`bid`,
   `forbidden`, `pass`, `raise`, `undo`, `err`, `confirm`). The stores call it where they call `vib()` today, so sound
   and haptic always travel together. This also replaces the one-size 10ms buzz with the patterns above.
4. **Haptic patterns** live in that same table: `TAP 10`, `NOPE [8,30,8]`, `BEAT [12,40,18]`, `BIG [20,40,20]`,
   `WIN [12,40,18,40,30]`. Android only; iPhone has no vibration API.
5. **A cue log for tests:** in dev and test builds, `cue` also records `{name, tier, at}` in a ring buffer readable
   from `window.__fxLog`. It's stripped from production builds, and it lets e2e check that "a round played these
   sounds in this order".
6. **The Sound Board in the lab** (`/?lab=moments`, dev only, `src/fx/lab/`): one tab listing every sound with play
   buttons, a pitch slider, the tier, and each game's sequences ("Kachuful round: all made", "sole miss", "new
   leader", "winner"; "Kaali Teeri: auction to 250", "SOLD", "1000"). **Jay approves the sounds here before they're
   wired into the games.**

## 7. In-game quick mute

At a card table nobody walks to the Me page to turn the sound down. Add a **speaker button** to each game's menu
(Kachuful's and Kaali Teeri's top-bar menu, and the desk rail):

- it cycles **All → Big moments → Off**, shown as an icon plus a label ("Sounds: Big moments")
- it writes the same `baithak.fx` setting, so it's one setting everywhere, with no new key
- it has a 44px target, an `aria-label`, and a toast that says what it switched to

Spades keeps its own mode (Everyone's / Only mine / Off), as now. The Me page's note text gets a line saying both
games now have sound.

## 8. Things to watch

- **iPhone:** Web Audio is **muted by the ring/silent switch** on iOS unless the page asks for playback. Safari 17+
  supports `navigator.audioSession.type = 'playback'`, which plays through the switch. **I recommend leaving the switch
  in charge** (a phone on silent at a table should stay silent) and adding one line to the setting: "On iPhone, the
  silent switch mutes sounds." This needs checking on a real iPhone.
- **Volume:** everything stays under the existing `MASTER` 0.55. Ticks peak around 0.05, beats 0.1–0.15, moments up
  to 0.25. Checked on a phone speaker at mid volume, and with Bluetooth speakers if the group uses them.
- **Six or more players:** the reveal's per-player run at 60ms gaps lasts at most about 0.5s, and the limiter keeps it
  clean. If 10 players sounds busy, it plays the made run as one chord instead.
- **Battery and CPU:** each sound is a few oscillators for under a second, so it's negligible. The noise buffers are
  created per play; cache the white-noise buffer once (a small engine fix while we're there).
- **No first-load growth:** neither game imports `fx/sound` statically. The `feedback.ts` table is tiny and imports
  the synth lazily.

## 9. Tests

- **Unit (Vitest):**
  - every `SoundName` has a recipe and a tier
  - `tierAudible` across all levels and tiers
  - the limiter (60ms, 4 voices, ducking)
  - pitch maths
  - `scheduleCues` with fake timers: the right names at the right times, cancelled on skip and unmount, collapsed
    under reduced motion
  - each game's event → sound tables are total (no event without an entry)
  - the quick-mute cycle writes `baithak.fx`
- **E2E (Playwright, reading `window.__fxLog`), with Sounds set to All:**
  - **Kachuful:**
    - a round with a hook → `flick`… `hook`… `made`/`missed` run → `tally` → `crown`
    - the last round → `bell`
    - the end → `fanfare`
  - **Kaali Teeri:** auction raises with rising pitch → `gavel` → partner `flick`s → `roll` → verdict → `bell` at
    1000 → `fanfare`
  - **The tiers:** on Big moments only the moment-tier cues appear, and on Off none do
  - **Reduced motion:** one cue per collapsed sequence
- **By ear (Jay):** the Sound Board first, then one real game of each on a real phone at a table, Android and iPhone
  (sound on and the silent switch on).

## 10. Phases (for progress reporting)

| Phase | What                                                                                            | Weight |
| ----- | ----------------------------------------------------------------------------------------------- | -----: |
| S0    | The 13 recipes + pitch + the Sound Board in the lab; **Jay listens and approves**               |   20% |
| S1    | Engine: limiter, `sequence.ts`, `feedback.ts` + haptic patterns, cue log, noise-buffer cache, quick mute | 15% |
| S2    | **Kachuful:** setup, deal, bids, hook, results, reveal, streaks, undo, winner (phone + desk)    |   25% |
| S3    | **Kaali Teeri:** setup, deal, auction, call, reveals, verdict, summary, 1000, winner (phone + desk) | 25% |
| S4    | Live pages, leaderboard podium, e2e, `perf:budget`, docs (`ARCHITECTURE.md` fx section, `TODO.md`), real-phone check |   15% |

S2 and S3 run as **two parallel agents** after S1, since they touch different game folders. The engine (S1) and the
Sound Board (S0) can also run in parallel once the recipe names are fixed.

This is about 25–30 files: the engine, 2 new fx modules, the lab tab, and about 10 screens per game. It's frontend
only, with no `backend-requests.md`.

## 11. Decisions for Jay (my recommendation first)

1. **Sound character:** **table sounds** (cards, wood, chips, a brass bell, a dhol for the winner) (recommended), or
   playful and arcade-like?
2. **What plays by default (Big moments):** Kachuful: the last-round bell, the winner fanfare and big achievements;
   Kaali Teeri: the SOLD gavel, the 1000 bell and the winner fanfare (recommended). Or make the round reveal a default
   too (louder nights)?
3. **The quick mute button in each game's menu:** yes (recommended)?
4. **iPhone silent switch:** **respect it** (recommended), or play through it?
5. **The reveal "tune"** (made results stepping up a scale): yes (recommended), or plain identical clicks?
6. **Should Kachuful's hook be a default (moment) sound?** It's the game's signature and fairly rare. I lean **beat
   (All only)**, since it can bite every round in some groups. Your call.
