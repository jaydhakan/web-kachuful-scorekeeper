# Trace at 4x CPU throttle

Flow: resume → 3 bids → menu and scoreboard sheets → play → results → confirm round (summary count-up) → next round (deal sequence) → Home → History and Boards pages.

Main-thread tasks: 8797. Longest: 35.8 ms.
Long tasks over 50 ms: 0.
Layout passes: 208. Forced (script-triggered) layouts: 0.

Slowest interaction (INP for this flow): 48 ms over 21 interactions. React commits: 80, components rendered: 4841.

## Per transition

A frame over 25 ms missed at least one 60 Hz refresh (a visible hitch). Interaction = worst Event Timing duration.

| Transition | Frames | Over 25 ms | Worst frame | Worst interaction | Commits | Components rendered |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Resume the game | 57 | 1 (1.8%) | 50 ms | 48 ms | 2 | 151 |
| Three bids | 137 | 0 (0.0%) | 17 ms | 32 ms | 11 | 648 |
| Menu sheet open and close | 101 | 0 (0.0%) | 17 ms | 32 ms | 4 | 342 |
| Scoreboard sheet open and close | 100 | 0 (0.0%) | 17 ms | 16 ms | 4 | 355 |
| Play, then results | 112 | 0 (0.0%) | 17 ms | 32 ms | 5 | 402 |
| Marking results | 42 | 0 (0.0%) | 17 ms | 32 ms | 14 | 659 |
| Confirm round: summary count-up and reorder | 255 | 0 (0.0%) | 17 ms | 16 ms | 7 | 536 |
| Next round: the deal sequence | 416 | 0 (0.0%) | 17 ms | 32 ms | 17 | 1053 |
| Quit to Home | 148 | 0 (0.0%) | 17 ms | 16 ms | 4 | 262 |
| History page in and out | 134 | 0 (0.0%) | 17 ms | 32 ms | 5 | 125 |
| Boards page in and out | 135 | 0 (0.0%) | 17 ms | 32 ms | 4 | 222 |

## Most rendered components

| Component | Renders |
| --- | ---: |
| a | 2231 |
| R | 615 |
| $t | 305 |
| pn | 238 |
| Rr | 119 |
| rt | 114 |
| nt | 114 |
| en | 100 |
| M | 84 |
| T | 53 |
| fn | 52 |
| dn | 52 |
| Ei | 45 |
| Z | 44 |
| li | 41 |
