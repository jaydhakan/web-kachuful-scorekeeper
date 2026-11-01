# Trace at 4x CPU throttle

Flow: resume → 3 bids → menu and scoreboard sheets → play → results → confirm round (summary count-up) → next round (deal sequence) → Home → History and Boards pages.

Main-thread tasks: 8384. Longest: 33.2 ms.
Long tasks over 50 ms: 0.
Layout passes: 204. Forced (script-triggered) layouts: 0.

Slowest interaction (INP for this flow): 32 ms over 21 interactions. React commits: 78, components rendered: 4798.

## Per transition

A frame over 25 ms missed at least one 60 Hz refresh (a visible hitch). Interaction = worst Event Timing duration.

| Transition | Frames | Over 25 ms | Worst frame | Worst interaction | Commits | Components rendered |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Resume the game | 55 | 1 (1.8%) | 50 ms | 32 ms | 2 | 151 |
| Three bids | 136 | 0 (0.0%) | 17 ms | 32 ms | 11 | 648 |
| Menu sheet open and close | 101 | 0 (0.0%) | 17 ms | 32 ms | 4 | 342 |
| Scoreboard sheet open and close | 100 | 0 (0.0%) | 17 ms | 16 ms | 4 | 355 |
| Play, then results | 112 | 0 (0.0%) | 17 ms | 32 ms | 5 | 402 |
| Marking results | 42 | 0 (0.0%) | 17 ms | 32 ms | 14 | 659 |
| Confirm round: summary count-up and reorder | 254 | 0 (0.0%) | 17 ms | 16 ms | 6 | 536 |
| Next round: the deal sequence | 415 | 0 (0.0%) | 17 ms | 32 ms | 17 | 1053 |
| Quit to Home | 148 | 0 (0.0%) | 17 ms | 16 ms | 4 | 262 |
| History page in and out | 134 | 0 (0.0%) | 17 ms | 32 ms | 5 | 125 |
| Boards page in and out | 134 | 0 (0.0%) | 17 ms | 32 ms | 4 | 222 |

## Most rendered components

| Component | Renders |
| --- | ---: |
| MotionComponent | 2218 |
| AnimatePresence | 599 |
| AvatarFill | 305 |
| PresenceChild | 237 |
| Glass | 118 |
| MeasureLayout | 114 |
| MeasureLayoutWithContext | 114 |
| Avatar | 100 |
| IconButton | 80 |
| PrimaryButton | 52 |
| PopChild | 51 |
| PopChildMeasure | 51 |
| Seg | 45 |
| SuitGlyph | 44 |
| Table | 41 |
