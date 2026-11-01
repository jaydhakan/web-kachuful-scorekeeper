# Lighthouse user flow (mobile, Slow 4G, 4x CPU, simulated throttling), median of 3

Navigations use Lighthouse's simulated throttling; "Play a round" is a timespan with DevTools throttling applied (INP comes only from timespans).

| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, first visit | 100 | 904 ms | 904 ms | 0 ms | 0.001 | 1.10 s | – | 282 KB |
| Game, returning | 100 | 1.36 s | 1.36 s | 0 ms | 0.000 | 1.36 s | – | 282 KB |
| Play a round | 100 | – | – | 0 ms | 0.014 | – | 40 ms | 0 KB |
| Tablet UI, first visit | 100 | 1.21 s | 1.21 s | 0 ms | 0.005 | 1.21 s | – | 276 KB |
