# Emerald Gilt — plan for the fourth theme

A dark theme taken from the emerald-and-gold playing-card deck Jay owns: a bottle-green field, gold foil linework,
Art Deco frames, ivory card faces. It is a fourth option in Admin › Appearance (not the default) and works everywhere
the other three do.

Working doc, tracked on `main` by Jay's choice. Once the theme and the backend change are pushed, delete it in one
cleanup commit together with `docs/EMERALD-GILT-PROMPT.md`, `backend-requests.md` and the prototype
`docs/EMERALD-GILT-TRUMP-REVEAL.html`.

The prototype is the reference for the trump reveal: open it in a browser for the look, the timing and the card art.

## Decisions (agreed with Jay, 2026-11-04)

| Question            | Answer                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Name / id           | **Emerald Gilt** / `emerald-gilt`                                                                                     |
| Scheme              | Dark                                                                                                                  |
| Colours             | Taken from the deck only (below); the Instagram palettes were only examples                                           |
| Fonts               | **Cinzel** (OFL, self-hosted latin woff2) for display and labels; **Instrument Sans** for body text and every number |
| Card art            | **The deck's real artwork**, used under permission Jay has from the rights holder: the card back and court cards (see Deck art) |
| Trump card          | The **King** of the trump suit; the **Queen of hearts** when Hearts are trump                                         |
| Reveal timing       | The backs fan out and **hold about 0.7s** before the trump card turns, so the art is seen (Emerald Gilt only)         |
| Scope               | Everything in "Where the theme shows" below                                                                           |
| Default             | No; a fourth option. `DEFAULT_THEME` stays `sunset-glass`                                                             |
| Git                 | Work on `main`, one commit per step, pushed as Jay asks; no feature branch                                            |
| Backend             | Written up in `backend-requests.md`; done after the whole frontend, in `../backend-kachuful-scorekeeper`             |

## Palette (from the deck)

Starting values. `src/theme/contrast.test.ts` is the judge; adjust a value if a pair fails, keeping the hue.

| Token                                  | Value                                                    | From the deck                                 |
| -------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `--bg`                                 | `#0C1A12`                                                | the darkest green of the box                  |
| `--surface-1/2/3`                      | `#102419` / `#163021` / `#1D3B29`                        | the back's field, each a step lighter         |
| `--felt` / `-hi` / `-lo`               | `#123D26` / `#1E6B3A` / `#0A2616`                        | the back's field under the filigree           |
| emerald accent (`--emerald`, new)      | `#2E9E58`                                                | the Emerald City towers on the box            |
| `--brand` / `--brand-press`            | `#C9A24E` / `#B08A3E`                                    | gold foil, middle tone                        |
| foil gradient (`--ga` → `--gb`)        | `#EBD08C` → `#A8853A`                                    | foil where it catches the light / in shadow   |
| `--on-brand`                           | `#0C1A12`                                                | ink on gold                                   |
| `--felt-rim`, `--arc`, `--tally-fg`    | `var(--brand)`                                           | the gold frame                                |
| `--text-1/2/3`                         | `#F5EEDC` / `#D8C9A6` / `#93AE96`                        | ivory card, parchment gold, sage              |
| `--hairline` / `-2`                    | `rgba(216,201,166,.14)` / `rgba(216,201,166,.26)`        | parchment at low opacity                      |
| `--glass-b` (group outline)            | `rgba(201,162,78,.38)`                                   | a thin gold rule                              |
| `--card-bg` / `--card-fg` / `--card-red` | `#FAF7F0` / `#123D26` / `#C21A2E`                      | the faces: green spades and clubs, crimson    |
| `--suit-red` / `--suit-red-felt`       | `#E8606E` / `#F07A86`                                    | crimson lifted for the dark ground            |
| `--suit-black`                         | `#F5EEDC`                                                | ivory on the dark ground                      |
| `--success` / `--danger` / `--warning` | `#7BD69C` / `#F07A86` / `#F0A860`                        | status, kept apart from gold                  |
| `--medal-gold` / `-hi` / `-lo`         | `#D4AF5F` / `#F0D995` / `#8A6A2E`                        | the foil                                      |
| `--card-back-a` / `-b`                 | `#0F3B24` / `#1E7A3C`                                    | fallback stripes if the art can't paint       |
| radii `--r-sm/md/lg/xl`                | `4px / 8px / 10px / 14px`                                | Deco frames are near-square; cards are rounded |

Measured with the WCAG formula: ivory on `--bg` 15.5:1, `--text-3` on `--surface-3` 5.1:1, gold on `--bg` 7.5:1,
ink on gold 7.5:1, crimson on the card face 5.6:1, the light red on the felt 4.6:1. Ink on the darkest end of the
foil gradient was 4.48:1 with `#9C7A34`, which is why the dark end is now `#A8853A`; the test confirms it.

**Player colours from the court cards.** `seatColor` matches each saved colour by hue, so the slots keep the order of
`src/domain/avatars.ts` `COLORS`: `--seat-1` orange → Lion's mane `#D99A6C`, `2` blue → gingham `#8EC1E3`, `3` yellow
→ brick road `#E3C25A`, `4` green → emerald `#6FCF95` (lighter so it stands off the felt), `5` violet → `#A88BD0`,
`6` pink → Glinda `#E89BB4`, `7` teal → `#7DBFB0`, `8` periwinkle → tin-man steel `#AFC0D6`, `9` coral → witch red
`#E07A6E`, `10` tan → straw `#D4B27C`. Check that every pair is still told apart on the felt.

## Type

- `--font-display: 'Cinzel'`, `--font-mono: 'Cinzel'` (labels in spaced caps, like the deck's "TRUSTED SINCE" line),
  `--font-body: 'Instrument Sans'`.
- Cinzel caps want **positive** tracking: `--display-track: 0.02em`, `--mono-track: 0.16em`.
- **Numbers stay in Instrument Sans** with `font-variant-numeric: tabular-nums`. Under `[data-theme='emerald-gilt']`,
  set the body font on everything that shows a number in the display face: `.mat-key`, `.hero-tally`, `.ticker`, the
  big score (`--big-*`), score count-ups, the podium and the score chart. Find them by grepping `font-display`,
  `.disp` and `--big-` usages that render digits.
- Player names at the table and in the hero row stay in Instrument Sans: Cinzel is caps-only and wide, and names have
  to be read across a table. The winner's name and screen titles use Cinzel.
- `THEMES['emerald-gilt'].fonts`: `['700 1em "Cinzel"', '400 1em "Instrument Sans"', '700 1em "Instrument Sans"']`.
- The font file is `src/assets/fonts/cinzel-latin-wght.woff2` (variable, 400–900), taken from the Fontsource CDN
  (`https://cdn.jsdelivr.net/fontsource/fonts/cinzel:vf@latest/latin-wght-normal.woff2`). That's a downloaded file,
  not an npm package. Add `cinzel` to `globIgnores` in `vite.config.ts` so only Instrument Sans stays precached.

## Deck art (licensed)

The theme uses the deck's real artwork. Jay has the rights holder's permission; keep that permission in writing
outside the repo. **The GitHub repo is public**, so every committed image is published: confirm the permission covers
that before committing any art (the prototype is already public).

| Asset                | Used for                                          | What we have now                         | Final source                |
| -------------------- | ------------------------------------------------- | ---------------------------------------- | --------------------------- |
| Card back            | Reveal fan and flip, dealt cards, loader, previews | Straightened photo, good                 | Publisher's original file   |
| Queen of hearts      | Trump card when Hearts are trump                  | Straightened photo, good                 | Publisher's original file   |
| King of clubs        | Trump card for Clubs                              | Straightened photo, a little soft        | Publisher's original file   |
| King of spades       | Trump card for Spades                             | **None**                                 | Publisher's file or a photo |
| King of diamonds     | Trump card for Diamonds                           | **None**                                 | Publisher's file or a photo |
| Joker (optional)     | Winner screen, see section 7                      | None                                     | Publisher's file            |

- **Files:** `src/assets/themes/emerald-gilt/` — `back.webp`, `back-mini.webp` (a 48×68 version for the tiny dealt
  cards), `king-spades.webp`, `king-diamonds.webp`, `king-clubs.webp`, `queen-hearts.webp`, each 600×840 (2× the
  largest size shown), WebP at about quality 85. Add a short `SOURCE.md` there saying where the art comes from and
  that it's used with permission.
- **Until a file arrives:** the photo crops are in the prototype (`docs/EMERALD-GILT-TRUMP-REVEAL.html`, embedded as
  data URIs) and can be extracted. A missing King falls back to today's suit-glyph face; never show another suit's
  card in its place.
- **Only downloaded in this theme:** reference the images only from `themes.css`, as tokens on the Emerald Gilt block
  (`--art-back: url(...)`, `--art-trump-hearts: url(...)` and so on). A CSS background loads only when something
  painted with it is on screen, so other themes never download them. Components use classes that paint from those
  tokens (`.card-art`, `.trump-face`); in other themes the tokens are unset and the classes paint what they do today.
- **Offline:** the precache only takes `js, css, html, woff2, webmanifest`. Add a runtime cache rule for
  `/assets/*.webp` (cache-first, like the fonts) so the art works offline after its first use.
- **Never used in:** the share image, the app icon, the splash screen or the manifest. Those leave the app; keep the
  art inside it unless the permission says otherwise.

## Where the theme shows

All motion animates `transform` and `opacity` only, runs once (no slow loops, per the Apple guidance on looping
motion near 0.2 Hz), never blocks a tap, and is off or a plain fade under `prefers-reduced-motion`. Every decorative
layer is `aria-hidden`.

### 1. Trump reveal — `src/screens/round/RoundStart.tsx`, `.deal-fan` in `src/styles/index.css`

Match the prototype. In order:

1. **Backs fan out and hold.** The five fanned backs and the back of the trump card show the real card back
   (`.card-art`). The fan spreads a little wider than today (40px apart, 8° each), holds, then falls away as the trump
   card turns. In Emerald Gilt the trump card's edge is the back's own dark border, not the white `--card-bg` border:
   give the edge its own token (`--card-back-edge`; every other theme sets it to `var(--card-bg)`).
2. **The trump card turns over after a hold of about 0.7s.** Its face is the trump suit's King, or the Queen of hearts
   for Hearts (`.trump-face`, painted from `--art-trump-<suit>`). Today the stage timers in `RoundStart.tsx` are
   `[820, …]` and the flip runs 0.8s from the start. Add a `--reveal-hold` token (`700ms` in Emerald Gilt, `0ms`
   everywhere else), read it once on mount, and add it to the flip's delay and the stage timers, so other themes keep
   today's timing exactly.
3. **Gold rays bloom behind the card** as it lands: a `repeating-conic-gradient` halo behind the card, masked to fade
   out from the centre, scaling `0.6 → 1` and fading in.
4. **One foil glint** sweeps across the face (translateX, about 650ms) just after it lands.
5. **Cards are dealt with the real back.** The small cards that fly from the dealer to each seat (`bg-card-deal`)
   use `back-mini.webp` in this theme.

- Reduced motion: no fan, no hold, no glint, no flight. The face fades in with the rays already showing.
- One tap still skips everything, as today.
- Check the large-screen layout too (`src/screens/desk/`), wherever it shows the round intro.

### 1b. The trump card elsewhere — next round and upcoming rounds

Wherever a later round's trump is shown as a big suit symbol, Emerald Gilt shows a small version of that round's trump
card (same rule: the King, or the Queen of hearts) with the symbol kept beside it for reading at a glance:

- `src/screens/round/Summary.tsx`: the "Next up" panel after a round.
- `src/sheets/UpcomingBody.tsx` (phone) and `src/screens/desk/UpcomingDrawer.tsx`, `src/screens/desk/ComingUp.tsx`
  (large screen): one small card per row.

Small means about 34×48px in a list row, 56×78px in the Next-up panel. These are decorations: `aria-hidden`, the
suit's name stays in text, and nothing changes size in any theme (the slot exists in every theme; others leave it
empty or show the glyph as today).

### 1c. Empty states

Where a list can be empty (Boards with no rounds in range, History with no games, a player with no games), Emerald
Gilt shows a single face-down card back, slightly tilted, above the existing empty message. Decorative and
`aria-hidden`; other themes unchanged.

### 2. The table — `.felt` in `themes.css`, `src/components/ui/Table.tsx`, `src/components/ui/SuitCenter.tsx`

- Felt: a radial emerald gradient, a **double gold rim** (inset gold line, a gap of `--bg`, an outer gold line, all as
  box-shadows like Editorial Paper's double rule) and faint gold rays through `.felt::after` (a conic gradient at 6–8%
  opacity, masked to the oval).
- The trump in the centre sits in a **dotted gold ring** like the deck's medallion: an `aria-hidden` element in
  `SuitCenter`, hidden in other themes.
- `.ambient` stays on (it's a dark theme with light), tinted gold: every `--trump-*` set to `var(--brand)`,
  `--trump-glow-amt` around 18%.
- The turn light (`.turn-rim` in `index.css`) is gold.

### 3. Buttons and controls — the `.mat-*` blocks in `themes.css`

- `.mat-fill` (the main action): the foil gradient, ink text, a 1px light top edge and a soft gold glow. On press, one
  quick sheen (a `::before` highlight moving across, about 300ms, none under reduced motion).
- `.mat-fill-s` / `-off` / `-d`: the dark field with a thin gold outline (inset shadow); danger keeps its red.
- `.mat-cta`: radius `--r-lg`, Cinzel caps with spaced tracking, sized so labels never wrap (Editorial Paper drops its
  tracking on `.mat-sm` for the same reason).
- `.mat-key`: dark field, gold hairline, Instrument Sans numerals; `.mat-key-on` is foil with ink.
- `.mat-seg` / `.mat-thumb`, `.mat-tog` / `.mat-knob`, `.mat-inp` (gold focus ring), `.mat-meter`, `.mat-ibtn`,
  `.mat-av` (thin gold ring), `.mat-name`, `.mat-bid`, `.mat-first`, `.mat-dealer` (a gold disc with ink "D"),
  `.mat-toast`, `.mat-sheet`, `.mat-grabber`: each gets an Emerald Gilt rule. The design system says every material
  gets a rule in every theme, so check the full list in `DESIGN-SYSTEM.md`, Materials.
- `.glass` (grouped surfaces): opaque `--surface-2` with a gold hairline, no blur.

### 4. Type and lettering

- `.mono-label`: Cinzel, weight 600, tracking `0.16em`, in the parchment colour.
- `.gold-text` (the wordmark, winners): a metallic foil gradient, as on Sunset Glass.
- `.hero-name`, `.ticker`: see Type above.

### 5. Gold piano-key border

A repeating gold dash strip (a `repeating-linear-gradient`, 3px tall) used in only three places: the top edge of
`.mat-sheet`, the frame on the Winner screen, and the frame of a new badge. Nowhere else, or it stops meaning
"special".

### 6. Winner — `src/screens/Winner.tsx`, `src/screens/desk/DeskWinner.tsx`, `src/components/ui/Confetti.tsx`

- A Deco frame (the piano-key strip with stepped corners) around the winner's name, its corners scaling in
  `0.8 → 1` with the existing outline-to-fill name.
- **Gold confetti**: `Confetti` takes its colours from the shells (`PhoneShell.tsx`, `DeskShell.tsx`). Add optional
  theme tokens `--confetti-1…4` (three golds and the emerald accent). When they're set, the shells pass those instead
  of the players' colours; when they're not (the other three themes), nothing changes. Read them with `colorValue` as
  the canvas needs real values.
- The podium medals already use the gold tokens.
- Optional, only once the Joker file exists: the Joker card (the Emerald City "OZ") turns over behind the winner's
  frame, once, like the trump reveal. Skip it rather than use a photo crop.

### 7. Badges and streaks — `src/components/BadgePop.tsx`, `src/components/StreakCelebration.tsx`

A gold Deco frame on the badge and the streak medallion, using the piano-key strip and a dotted ring. Emerald Gilt
only; motion unchanged.

### 8. Loader — `src/components/ui/Loader.tsx`

In Emerald Gilt a small real card back (`back-mini.webp`) flips on Y in place of the ball. Both shapes are in the DOM, CSS
shows one per theme. Reduced motion: the card stands still. The 300ms invisible start stays.

### 9. Appearance preview — `src/screens/pages/AppearancePanel.tsx`

- Add the `--m-*` preview tokens for Emerald Gilt (`--m-felt`, `--m-felt-shadow`, `--m-key`, `--m-key-shadow`,
  `--m-on`, `--m-btn`, `--m-btn-shadow`, `--m-av-shadow`, `--m-r`).
- Add a small card back in each preview tile's corner, painted from tokens (`--m-back`), so all four previews show
  their own back (Emerald Gilt's is the real one). Previews must not use the material classes (nested themes leak them); that's why it's a token.

## Registry, tests and tools

| File                                                            | Change                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/theme/themes.ts`                                           | Add `'emerald-gilt'` to `ThemeId` and to `THEMES` (`label: 'Emerald Gilt'`, `scheme: 'dark'`, `themeColor: '#0C1A12'`, fonts above) |
| `src/styles/themes.css`                                         | `@font-face` for Cinzel; the token block; preview tokens; every material rule; update the header comment       |
| `src/styles/index.css`                                          | `.turn-rim`; the reveal's fan, halo and glint keyframes; `.card-art`, `.trump-face`; the reduced-motion block |
| `src/theme/colors.ts`                                           | `card-back` / `card-deal` paint the art when a theme sets it; the edge token                                 |
| `src/assets/themes/emerald-gilt/`                               | The deck art and `SOURCE.md` (see Deck art)                                                                    |
| `src/screens/round/RoundStart.tsx`                              | Read `--reveal-hold`; the trump face; the halo and glint layers                                               |
| `src/screens/round/Summary.tsx`, `src/sheets/UpcomingBody.tsx`, `src/screens/desk/UpcomingDrawer.tsx`, `src/screens/desk/ComingUp.tsx` | The small trump-card slot (1b) |
| `vite.config.ts`                                                | `cinzel` in `globIgnores`; a cache-first runtime rule for the `.webp` art. The boot script picks up the new theme by itself |
| `e2e/themes.spec.ts`                                            | Add it to `THEMES` and `'emerald-gilt': ['cinzel', 'instrument-sans']` to the font map                        |
| `src/theme/themes.test.ts`, `src/state/theme.test.ts`           | One case each: the new id resolves and applies                                                                |
| `tools/mock-api/server.ts`, `tools/screens/quick.spec.ts`, `tools/screens/admin.spec.ts` | Add the id to their theme lists                                                       |
| `docs/codebase/DESIGN-SYSTEM.md`                                | "three" → "four"; an Emerald Gilt bullet; Cinzel under fonts; the deck-art rule (images only through `themes.css` tokens); the new motion entries |

`contrast.test.ts` reads every theme from `THEME_IDS`, so it covers the new one by itself. Add the felt pairs (light
red and ivory on `--felt-hi`) if they aren't already measured.

## Rules this work must keep

- Paint, never geometry: no size, padding or position changes in any theme. `e2e/themes.spec.ts` proves it.
- Colours only in `themes.css` (lint rejects hex in components). The deck images are referenced only from
  `themes.css` too, so no component knows which theme has art.
- Other themes look and time exactly as before: every new hook (`--reveal-hold`, `--card-back-edge`, the trump-card
  slot) has a neutral value in all four themes.
- Every control at least 44px, focus rings visible (gold on dark), real buttons and labels.
- Saved data untouched: the stored keys are `kf.theme`, `kf.theme.user` and `kf.theme.appearance`, and an unknown id
  already falls back.
- No new npm dependency.
- Comments: 1–3 lines, the reason only.

## Steps

| #  | Step                                                                                         | Done when                                                     | Overall |
| -- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| 0  | On `main`: run typecheck, lint and unit tests; note anything already failing               | baseline recorded                                             | 3%      |
| 1  | Registry, Cinzel, token block, preview tokens, seat colours, `globIgnores`                  | the admin can preview and apply it; contrast test passes      | 18%     |
| 2  | Every material rule, type roles, numbers in Instrument Sans, gold text, ambient, turn light  | every screen reads well; themes e2e geometry test passes      | 35%     |
| 3  | Deck art: the files you have, `SOURCE.md`, tokens, `.card-art`, `.trump-face`, edge token, mini back, offline cache | backs and faces show; other themes unchanged | 45% |
| 4  | Trump reveal: hold, wider fan, King / Queen of hearts face, halo, glint, real-back deal, reduced motion | matches the prototype on phone and large screen | 56% |
| 5  | Table: felt rim, rays, dotted trump ring, gold glow                                          | bidding, playing and results look right on 4–10 seats         | 63%     |
| 6  | Small trump card in Next up and the upcoming lists (1b); empty-state card back (1c)         | each shown by hand on phone and large screen                  | 70%     |
| 7  | Piano-key strip; Winner frame; gold confetti tokens (Joker only if its file exists)         | winner on phone and desk; other themes' confetti unchanged    | 78%     |
| 8  | Badges, streaks, loader                                                                      | each shown once by hand                                       | 83%     |
| 9  | Appearance preview card back for all four themes                                             | four tiles, no leaking between them                           | 86%     |
| 10 | Tests and tools lists; full e2e (rerun failures alone, per CLAUDE.md); screenshots of every screen | green; screenshots looked at                           | 93%     |
| 11 | `DESIGN-SYSTEM.md`                                                                           | doc matches the code                                          | 95%     |
| 12 | Backend: the request in `backend-requests.md`, in the backend repo                          | backend tests pass; signed-in apply reaches everyone          | 98%     |
| 13 | Cleanup: delete this plan, the prompt, `backend-requests.md` and the prototype HTML         | one commit, pushed                                            | 100%    |

One Conventional Commit per step (from step 1) on `main`, no co-author trailer. Push when Jay asks. Missing art (the
King of spades and diamonds, until their files arrive) doesn't block a step: the fallback is today's suit glyph.

## Checks before calling it done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (failures rerun alone with
  `npx playwright test --last-failed --workers=1`).
- Screenshots of every screen in Emerald Gilt at 360×780 and on a large screen (`tools/screens`), looked at, not just
  produced.
- By hand: reduced motion on, reduced transparency on, forced colours (Windows high contrast) still readable.
- Switch to Emerald Gilt mid-round and back: the game is untouched.
- Signed out: no network request apart from the font and the deck art, both from our own origin. Signed in, before
  the backend change: applying it says "saved on this device only". After it: it reaches everyone.
- In another theme, the network panel shows no request for any Emerald Gilt image or font.
- Offline after one visit in Emerald Gilt: the reveal still shows the real back and faces.
- Timing: in the other three themes the round intro takes exactly as long as before.
