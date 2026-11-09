# Baithak — round 2 screens

128 screens, each as a standalone HTML file (`html/`) and a 2× PNG (`png/`), named
`<area>-<screen>-<state>-<theme>-<device>`. Devices: `phone` 390 × 844, `landscape` 844 × 390,
`desktop` / `tablet` 1280 × 800, `storyboard` 1240 × 1260. The Ishaara clue-giver phone is theme-independent and uses `dark`.

| Area | What | Themes | Files |
|---|---|---|---|
| `landing-home` | first-visit, signed-out, signed-in, in-progress, two-in-progress, offline, six-games · phone + desktop | all 4 | 56 |
| `landing-menu` | menu sheet (account, theme for admins, credits, about) | Sunset, Emerald | 2 |
| `landing-transition` | landing → Kachuful → back, motion and reduced | Sunset, Emerald | 4 |
| `kachuful-menu`, `kachuful-rail` | “All games” in the menu; Baithak tile on the desktop rail | Sunset, Emerald | 4 |
| `platform-loading` | downloading, couldn’t load | Sunset, Emerald | 4 |
| `kaali-*` | setup (rules, seating), bidding (auction, quick), call (trump, partners, two decks), playing (called cards, played by, reveal), result (made, missed), scoreboard, winner; desktop bidding + playing | Sunset, Emerald | 32 |
| `ishaara-board-turn-sun` | the board: phone, landscape, tablet | all 4 | 12 |
| `ishaara-*` | setup teams, words and rules, waiting for clue-givers, 4 reveals, 2 wins, reconnecting | Sunset | 10 |
| `ishaara-clue-*` | your games, key gate, key (your turn / waiting) | dark | 4 |

Also in this zip:
- `tokens.css`: every theme token; the HTML files embed this exact file.
- `TOKENS.md`: new and corrected tokens (round-1 format). `NOTES.md`: decisions and open questions.
- `svg/games/kachuful/tile-art.svg` + `og-image.png`: Kachuful redrawn on green felt with the gold spade.
- `svg/games/<game>/tile-art-<theme>.svg`: tile art per theme (12).
- `svg/cards-emerald/`: 48 stand-in faces + a stand-in back, `sheet-all-cards.svg` (with a PNG preview). Requested singles: `card-3s.svg`, `card-a{s,h,d,c}.svg`, `card-j{s,h,d,c}.svg`, `card-q{s,d,c}.svg`, `card-7h.svg` (Q♥ is photographed).
