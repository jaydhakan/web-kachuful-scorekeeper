# Lighthouse user flow (mobile, Slow 4G, 4x CPU, applied throttling), median of 3

Every step runs under DevTools throttling applied for real.

| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, first visit | 93 | 2.58 s | 2.58 s | 0 ms | 0.000 | 2.82 s | – | 276 KB |
| Game, returning | 93 | 2.58 s | 2.58 s | 0 ms | 0.000 | 283 ms | – | 276 KB |
| Play a round | 100 | – | – | 0 ms | 0.000 | – | 37 ms | 0 KB |
| Tablet UI, first visit | 86 | 3.34 s | 3.34 s | 0 ms | 0.000 | 2.74 s | – | 297 KB |
