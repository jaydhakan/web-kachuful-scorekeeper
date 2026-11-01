# Lighthouse user flow (mobile, Slow 4G, 4x CPU, simulated throttling), median of 3

Navigations use Lighthouse's simulated throttling; "Play a round" is a timespan with DevTools throttling applied (INP comes only from timespans).

| Step | Perf | FCP | LCP | TBT | CLS | Speed Index | INP | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home, first visit | 100 | 904 ms | 904 ms | 0 ms | 0.000 | 904 ms | – | 247 KB |
| Game, returning | 100 | 903 ms | 903 ms | 0 ms | 0.000 | 903 ms | – | 247 KB |
| Play a round | 100 | – | – | 0 ms | 0.014 | – | 44 ms | 0 KB |
| Tablet UI, first visit | 100 | 907 ms | 907 ms | 0 ms | 0.005 | 907 ms | – | 242 KB |
