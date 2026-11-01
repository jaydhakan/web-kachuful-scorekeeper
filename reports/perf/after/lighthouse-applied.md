# Lighthouse user flow (mobile, Slow 4G, 4x CPU, applied throttling), median of 3

Every step runs under DevTools throttling applied for real.

| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, first visit | 96 | 2.16 s | 2.16 s | 0 ms | 0.001 | 2.40 s | – | 282 KB |
| Game, returning | 97 | 2.17 s | 2.17 s | 0 ms | 0.000 | 264 ms | – | 282 KB |
| Play a round | 100 | – | – | 0 ms | 0.000 | – | 41 ms | 0 KB |
| Tablet UI, first visit | 94 | 2.55 s | 2.55 s | 0 ms | 0.006 | 1.32 s | – | 302 KB |
