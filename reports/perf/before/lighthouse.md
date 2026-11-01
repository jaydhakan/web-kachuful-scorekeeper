# Lighthouse user flow (mobile, Slow 4G, 4x CPU, simulated throttling), median of 3

Navigations use Lighthouse's simulated throttling; "Play a round" is a timespan with DevTools throttling applied (INP comes only from timespans).

| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, first visit | 100 | 902 ms | 902 ms | 0 ms | 0.000 | 902 ms | – | 272 KB |
| Game, returning | 100 | 1.50 s | 1.50 s | 0 ms | 0.000 | 1.50 s | – | 272 KB |
| Play a round | 100 | – | – | 0 ms | 0.014 | – | 38 ms | 0 KB |
| Tablet UI, first visit | 100 | 1.20 s | 1.20 s | 0 ms | 0.000 | 1.20 s | – | 298 KB |
