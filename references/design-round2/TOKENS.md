# Tokens — round 2

Source of truth: `tokens.css` (same file every HTML screen embeds). Themes change colour, type, radius and shadow only; every size token is shared.

## Corrected type (replaces round 1)

| Token | Sunset Glass | Emerald Gilt | Yerba Sun | Editorial Paper | Used for |
|---|---|---|---|---|---|
| `--font-display` | Instrument Sans 700 | Cinzel 700 (caps) | Bricolage Grotesque 800 | Instrument Serif italic | Titles, game names |
| `--font-body` | Instrument Sans | Instrument Sans | Bricolage Grotesque | Instrument Sans | Body, buttons |
| `--font-label` | Instrument Sans 700, uppercase, .14em | Cinzel 700, .12em | Space Mono 700, .1em | DM Mono 500, .14em | Eyebrow labels |
| `--font-num` **NEW** | Instrument Sans 700 | Instrument Sans 700 | Bricolage Grotesque 800 | Instrument Serif italic | Every number (bids, scores, timers). Emerald never sets numbers in Cinzel |
| `--display-transform` **NEW** | none | uppercase | none | none | Cinzel titles |

## New tokens

| Token | Sunset Glass | Emerald Gilt | Yerba Sun | Editorial Paper | Used for |
|---|---|---|---|---|---|
| `--shadow-outline` | none | none | `0 0 0 2px #2b1608` | none | Yerba’s thick outline, drawn as a shadow so borders stay 1 px and nothing moves |
| `--control-on-bg` | `#fbf0ea` | `#d9b45a` | `#2b1608` | `#161616` | Selected segment, chosen suit/rank |
| `--control-on-text` | `#2a0e16` | `#1b1405` | `#fff6e2` | `#faf8f3` | Text on the above |
| `--select-ring` | `#ffd59a` | `#f4dc94` | `#2b1608` | `#c2330f` | Selected word card, picked card slot |
| `--radius-key` | 16px | 12px | 14px | 0 | Word cards and key cells |
| `--table-felt` | `#c8508a` | `#2a6a4c` | `#ef7a5f` | `#245a46` | In-game table, tile art |
| `--table-felt-2` | `#6d1c4a` | `#0f3324` | `#e0563b` | `#1a4234` | Table gradient edge |
| `--table-rim` | `rgba(255,214,230,.35)` | `#c9a24a` | `#2b1608` | `#f1ede4` | Table rim |
| `--seat-ring` | `rgba(255,226,236,.35)` | `rgba(217,180,90,.6)` | `#2b1608` | `#161616` | Avatar ring at a seat |
| `--seat-active` | `#ffb27a` | `#ecc977` | `#2b1608` | `#c2330f` | Whose turn; loading ring; table arrows |
| `--side-bid` | `#e9c46a` | `#d9b45a` | `#ec6a4f` | `#161616` | Kaali Teeri bidder/partner badge (always with crown or link icon + word) |
| `--side-bid-ink` | `#2a1a05` | `#1b1405` | `#2b1608` | `#faf8f3` | Text on the badge |
| `--positive` | `#7fe0a8` | `#8fe0ae` | `#1f7a4a` | `#1f6a44` | +points, “Made”, joined |
| `--negative` | `#ff8a9a` | `#ff9a8a` | `#b3261e` | `#b3261e` | −points, “Missed” |
| `--suit-red` | `#ff8fb0` | `#ff9a8a` | `#c8462c` | `#c2330f` | Hearts/diamonds icons in the UI |
| `--deck-face` | `#fbf3ec` | `#f6efe3` | `#fff6e2` | `#ffffff` | Card face |
| `--deck-ink` | `#1d1418` | `#1a1a12` | `#2b1608` | `#161616` | Spades/clubs, ranks |
| `--deck-red` | `#c0263f` | `#a8202e` | `#c8462c` | `#c2330f` | Hearts/diamonds on a card |
| `--deck-rule` | `#e2a3b8` (single) | `#b8862f` (double) | `#2b1608` | `#161616` | Card frame rule, J/Q/K/A emblems |
| `--deck-back` | `#9a3466` | `#1d5a40` | `#ec6a4f` | `#1d1d1d` | Card back (Emerald: stand-in until the photo back is used) |
| `--team-moon` | `#4f5bd5` | `#4f5bd5` | `#3f4bc4` | `#3f4bc4` | Ishaara Moon (round 1 value kept) |
| `--clue-bg` / `--clue-surface` / `--clue-border` | `#0e0e10` / `#1a1a1e` / `#2c2c32` | same | same | same | Clue-giver phone: plain and dark in every theme |
| `--clue-text` / `--clue-muted` | `#e9e6e1` / `#a19d97` | same | same | same | Clue-giver phone text |
| `--motion-reduced` | 150ms | same | same | same | Reduced-motion cross-fade (was 120 ms) |

Unchanged from round 1 and still used: `--team-sun`, `--card-word`, `--card-blank`, `--card-trap`, `--badge-soon-*`, `--status-*`, `--scrim`, `--sheet-bg`, `--motion-enter`, `--motion-exit`, `--motion-ease-*`, type scale `--text-xs … --text-5xl`, `--tap-min: 48px`.

Clue-giver key cells use fixed dark tints (not theme tokens): Sun `#3a2604` / `#f5c46a`, Moon `#1b1f4f` / `#bcc2ff`, Blank `#25252a` + hatch, Trap `#000` with a `#ff9a8a` outline.
