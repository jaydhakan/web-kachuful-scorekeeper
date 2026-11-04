# Emerald Gilt — plan for the fourth theme

A dark theme taken from the emerald-and-gold playing-card deck Jay owns: a bottle-green field, gold foil linework,
Art Deco frames, ivory card faces. It is a fourth option in Admin › Appearance (not the default) and works everywhere
the other three do.

Working doc: delete it with `backend-requests.md` and `docs/EMERALD-GILT-PROMPT.md` once the frontend and backend
work is committed. Never commit it.

## Decisions (agreed with Jay, 2026-11-04)

| Question            | Answer                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Name / id           | **Emerald Gilt** / `emerald-gilt`                                                                                     |
| Scheme              | Dark                                                                                                                  |
| Colours             | Taken from the deck only (below); the Instagram palettes were only examples                                           |
| Fonts               | **Cinzel** (OFL, self-hosted latin woff2) for display and labels; **Instrument Sans** for body text and every number |
| Card back           | Our own design with the deck's layout (below); none of the deck's artwork, monogram or trademarks                     |
| Scope               | Everything in "Where the theme shows" below                                                                           |
| Default             | No; a fourth option. `DEFAULT_THEME` stays `sunset-glass`                                                             |
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

## The card back (our own, in the deck's layout)

The deck's layout: a gold piano-key frame with a thin inner rule; emerald filigree along the edges; gold rays from the
centre; two dotted-ring medallions stacked with the monogram drawn twice, the second turned 180° (a two-way back); a
small centre joint. Ours keeps that layout and uses none of the deck's pictures:

```
┌▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬┐   ▬ gold piano-key frame + thin emerald inner rule
▌ ♠ ∿∿∿∿∿∿∿∿∿∿∿∿ ♥ ▐   corners: the four suits in gold (the deck has flying monkeys here)
▌ ∿   ╱ ⋯⋯⋯ ╲   ∿ ▐   ∿ emerald filigree, symmetric
▌ ∿  ⋮  K   ⋮  ∿ ▐   top medallion: a dotted gold ring, a gold Deco "K" for Kachuful
▌ ◆ ∿ ╲ ⋯⋯⋯ ╱ ∿ ◆ ▐   sides: a small cut emerald gem in gold (the deck has balloons here)
▌ ∿     ◇●●◇     ∿ ▐   centre joint: a gold lozenge with two emerald dots
▌ ∿  ╱ ⋯⋯⋯ ╲  ∿ ▐
▌ ∿  ⋮  ꓘ   ⋮  ∿ ▐   bottom medallion: the same K turned 180°
▌ ♦ ∿∿∿∿∿∿∿∿∿∿∿∿ ♣ ▐   gold rays fan out behind both medallions
└▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬┘
```

**How it's built (colours stay in `themes.css`):** two SVGs used only as **masks**, holding shape but no colour:
`src/assets/themes/emerald-gilt/back-gold.svg` (frame, rays, rings, K, suits, gem outlines, lozenge) and
`back-filigree.svg` (filigree, inner rule, gem fill, dots). A `.card-art` box paints the dark field from
`--card-back-a`, then a `::before` layer filled with the emerald token and masked by the filigree, then an `::after`
layer filled with the foil gradient and masked by the gold shapes. Use `mask-image` and `-webkit-mask-image`. Draw the
K as paths, not text, so it doesn't depend on a font. Each SVG under 6 KB, the whole back symmetric under a 180° turn.
Add a simpler `back-mini.svg` (frame plus one centre dot) for the 16×22px dealt cards, where detail would blur.

Every other theme keeps its striped back exactly as it is: `.card-art` without the Emerald Gilt rules paints today's
`bg-card-back` gradient. One component, four looks.

## Where the theme shows

All motion animates `transform` and `opacity` only, runs once (no slow loops, per the Apple guidance on looping
motion near 0.2 Hz), never blocks a tap, and is off or a plain fade under `prefers-reduced-motion`. Every decorative
layer is `aria-hidden`.

### 1. Trump reveal — `src/screens/round/RoundStart.tsx`, `.deal-fan` in `src/styles/index.css`

- The five fanned backs and the back of the flipping card use `.card-art`. In Emerald Gilt the flipping card's edge is
  dark green, not the white `--card-bg` border: give the edge its own token (`--card-back-edge`; every other theme
  sets it to `var(--card-bg)` so nothing else changes).
- The face is ivory, framed by a thin gold rule inset from the edge, with gold **rays** behind the suit like the
  deck's aces. Rays are a `repeating-conic-gradient` masked to fade out from the centre; they scale `0.7 → 1` and fade
  in as the flip lands (about 0.65s).
- One **foil glint**: a narrow diagonal highlight sweeps once across the face (translateX, about 600ms) after the flip
  lands. Emerald Gilt only.
- The dealt cards flying to seats use the mini back.
- Reduced motion: no fan and no glint (as today), rays shown still.
- Check the large-screen layout too (`src/screens/desk/`), wherever it shows the round intro.

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

### 7. Badges and streaks — `src/components/BadgePop.tsx`, `src/components/StreakCelebration.tsx`

A gold Deco frame on the badge and the streak medallion, using the piano-key strip and a dotted ring. Emerald Gilt
only; motion unchanged.

### 8. Loader — `src/components/ui/Loader.tsx`

In Emerald Gilt a small card back (the mini art) flips on Y in place of the ball. Both shapes are in the DOM, CSS
shows one per theme. Reduced motion: the card stands still. The 300ms invisible start stays.

### 9. Appearance preview — `src/screens/pages/AppearancePanel.tsx`

- Add the `--m-*` preview tokens for Emerald Gilt (`--m-felt`, `--m-felt-shadow`, `--m-key`, `--m-key-shadow`,
  `--m-on`, `--m-btn`, `--m-btn-shadow`, `--m-av-shadow`, `--m-r`).
- Add a small card back in each preview tile's corner, painted from tokens (`--m-back`), so all four previews show
  their own back. Previews must not use the material classes (nested themes leak them); that's why it's a token.

## Registry, tests and tools

| File                                                            | Change                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/theme/themes.ts`                                           | Add `'emerald-gilt'` to `ThemeId` and to `THEMES` (`label: 'Emerald Gilt'`, `scheme: 'dark'`, `themeColor: '#0C1A12'`, fonts above) |
| `src/styles/themes.css`                                         | `@font-face` for Cinzel; the token block; preview tokens; every material rule; update the header comment       |
| `src/styles/index.css`                                          | `.turn-rim`; the reveal's rays and glint keyframes; the reduced-motion block                                  |
| `src/theme/colors.ts`                                           | `card-back` reads the art when a theme sets it (or `.card-art` replaces `bg-card-back`); the edge token      |
| `vite.config.ts`                                                | `cinzel` in `globIgnores`. The boot script picks up the new theme by itself                                   |
| `e2e/themes.spec.ts`                                            | Add it to `THEMES` and `'emerald-gilt': ['cinzel', 'instrument-sans']` to the font map                        |
| `src/theme/themes.test.ts`, `src/state/theme.test.ts`           | One case each: the new id resolves and applies                                                                |
| `tools/mock-api/server.ts`, `tools/screens/quick.spec.ts`, `tools/screens/admin.spec.ts` | Add the id to their theme lists                                                       |
| `docs/codebase/DESIGN-SYSTEM.md`                                | "three" → "four"; an Emerald Gilt bullet; Cinzel under fonts; the mask-art rule; the new motion entries      |

`contrast.test.ts` reads every theme from `THEME_IDS`, so it covers the new one by itself. Add the felt pairs (light
red and ivory on `--felt-hi`) if they aren't already measured.

## Rules this work must keep

- Paint, never geometry: no size, padding or position changes in any theme. `e2e/themes.spec.ts` proves it.
- Colours only in `themes.css` (lint rejects hex in components); the SVGs are masks with no colour.
- Every control at least 44px, focus rings visible (gold on dark), real buttons and labels.
- Saved data untouched: the stored keys are `kf.theme`, `kf.theme.user` and `kf.theme.appearance`, and an unknown id
  already falls back.
- No new npm dependency.
- Comments: 1–3 lines, the reason only.

## Steps

| #  | Step                                                                                         | Done when                                                     | Overall |
| -- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| 0  | Branch `feat/emerald-gilt-theme`; run typecheck, lint and unit tests; note anything already failing | baseline recorded                                     | 3%      |
| 1  | Registry, Cinzel, token block, preview tokens, seat colours, `globIgnores`                  | the admin can preview and apply it; contrast test passes      | 20%     |
| 2  | Every material rule, type roles, numbers in Instrument Sans, gold text, ambient, turn light  | every screen reads well; themes e2e geometry test passes      | 40%     |
| 3  | Card art: mask SVGs, `.card-art`, edge token, mini back                                     | backs show on the reveal, deal, and in other themes unchanged | 52%     |
| 4  | Trump reveal: rays, glint, reduced motion                                                    | checked on phone and large screen, with and without motion    | 62%     |
| 5  | Table: felt rim, rays, dotted trump ring, gold glow                                          | bidding, playing and results look right on 4–10 seats         | 70%     |
| 6  | Piano-key strip; Winner frame; gold confetti tokens                                         | winner on phone and desk; other themes' confetti unchanged    | 80%     |
| 7  | Badges, streaks, loader                                                                      | each shown once by hand                                       | 86%     |
| 8  | Appearance preview card back for all four themes                                             | four tiles, no leaking between them                           | 89%     |
| 9  | Tests and tools lists; full e2e (rerun failures alone, per CLAUDE.md); screenshots of every screen | green; screenshots looked at                           | 95%     |
| 10 | `DESIGN-SYSTEM.md`                                                                           | doc matches the code                                          | 97%     |
| 11 | Backend: the request in `backend-requests.md`, in the backend repo                          | backend tests pass; signed-in apply reaches everyone          | 100%    |

One Conventional Commit per step (from step 1), no co-author trailer. Never commit the three working docs.

## Checks before calling it done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (failures rerun alone with
  `npx playwright test --last-failed --workers=1`).
- Screenshots of every screen in Emerald Gilt at 360×780 and on a large screen (`tools/screens`), looked at, not just
  produced.
- By hand: reduced motion on, reduced transparency on, forced colours (Windows high contrast) still readable.
- Switch to Emerald Gilt mid-round and back: the game is untouched.
- Signed out: no network request apart from the font. Signed in, before the backend change: applying it says "saved on
  this device only". After it: it reaches everyone.
