# Visual parity: prototype vs port (390×844)

Both apps seeded with the same demo fixture, clock fixed to 2026-01-01T12:00Z, `prefers-reduced-motion: reduce` so infinite animations are static, same self-hosted fonts.

| Screen | Diff % | Note |
| --- | ---: | --- |
| home-new-game-modal | 30.311 | ⚠ unexplained |
| sheet-edit | 15.612 | ⚠ unexplained |
| sheet-share | 12.626 | Share gap: the press-and-hold caption became Share / Copy buttons |
| bidding-all-in | 10.663 | ⚠ unexplained |
| bidding-dealer-locked | 9.328 | ⚠ unexplained |
| home | 6.845 | ⚠ unexplained |
| results-filled | 6.744 | ⚠ unexplained |
| results-empty | 6.066 | ⚠ unexplained |
| bidding | 3.586 | ⚠ unexplained |
| play | 3.468 | ⚠ unexplained |
| results-exact | 0.960 |  |
| summary-end-modal | 0.931 |  |
| summary | 0.925 |  |
| setup-1 | 0.800 |  |
| setup-1-n5 | 0.682 |  |
| sheet-menu | 0.410 |  |
| setup-3-length-open | 0.357 |  |
| setup-2-empty | 0.189 |  |
| setup-2 | 0.186 |  |
| winner | 0.105 |  |
| sheet-upcoming | 0.054 |  |
| sheet-rules | 0.037 |  |
| sheet-rename | 0.012 |  |
| sheet-avatar | 0.009 |  |
| setup-3 | 0.007 |  |
| sheet-seat | 0.000 |  |
| sheet-board | 0.000 |  |

Screens: 27. Above 1%: 10 (9 unexplained). Worst: home-new-game-modal (30.311%).
