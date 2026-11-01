# Trace at 4x CPU throttle

Flow: resume → 3 bids → menu and scoreboard sheets → play → results → confirm round (summary count-up) → next round (deal sequence) → Home → History and Boards pages.

Main-thread tasks: 8273. Longest: 28.0 ms.
Long tasks over 50 ms: 0.
Layout passes: 204. Forced (script-triggered) layouts: 0.

## Frames per transition

A frame over 25 ms missed at least one 60 Hz refresh (a visible hitch).

| Transition | Frames | Over 25 ms | Worst |
| --- | ---: | ---: | ---: |
| Resume the game | 53 | 2 (3.8%) | 67 ms |
| Three bids | 135 | 0 (0.0%) | 17 ms |
| Menu sheet open and close | 101 | 0 (0.0%) | 17 ms |
| Scoreboard sheet open and close | 100 | 0 (0.0%) | 17 ms |
| Play, then results | 112 | 0 (0.0%) | 17 ms |
| Marking results | 41 | 0 (0.0%) | 17 ms |
| Confirm round: summary count-up and reorder | 255 | 0 (0.0%) | 17 ms |
| Next round: the deal sequence | 415 | 0 (0.0%) | 17 ms |
| Quit to Home | 147 | 1 (0.7%) | 33 ms |
| History page in and out | 134 | 0 (0.0%) | 17 ms |
| Boards page in and out | 134 | 0 (0.0%) | 17 ms |
