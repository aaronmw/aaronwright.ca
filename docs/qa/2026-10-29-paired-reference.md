# QA run 2026-10-29T17-15-11-275Z

Source: `d9a39959cc7944e14c32028492474e7a1edfcee39fcf3aa18a23e5d0063c9645`

Commit: `b9fcafc3b23b9eea96d9d73eb8b1ef152f027a67` (working-tree contents are captured by the source hash).

Environment: `{"platform":"darwin","osRelease":"27.0.0","arch":"arm64","cpu":"Apple M1 Pro","cores":10,"browserVersion":"156.0.8078.4","node":"v22.23.2"}`

Status: **blocked**. Unit checks: passed. Browser checks: passed.

Browser matrix: 106 passed, 0 failed, 14 skipped.

Values are medians of 3 runs, in milliseconds. Incomplete groups are not eligible as a baseline.

| Profile | Task | Samples | Task duration | Longest task | Longest animation frame | p95 frame gap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| desktop | cold-entry | 3 | 878.4 | 55.0 | 260.6 | 50.0 |
| desktop | choose-project | 3 | 1642.4 | 0.0 | 0.0 | 16.7 |
| desktop | horizontal-gesture | 3 | 1983.5 | 0.0 | 0.0 | 16.7 |
| desktop | image-viewer | 3 | 1802.1 | 0.0 | 0.0 | 16.7 |
| desktop | vertical-navigation | 3 | 3443.8 | 0.0 | 0.0 | 16.7 |
| desktop | appearance | 3 | 510.6 | 0.0 | 0.0 | 16.8 |
| small-laptop-slow | cold-entry | 3 | 4922.1 | 256.0 | 2222.8 | 50.0 |
| small-laptop-slow | choose-project | 3 | 1622.1 | 0.0 | 70.2 | 16.8 |
| small-laptop-slow | horizontal-gesture | 3 | 9060.5 | 0.0 | 0.0 | 16.7 |
| small-laptop-slow | image-viewer | 3 | 2025.3 | 81.0 | 97.6 | 16.8 |
| small-laptop-slow | vertical-navigation | 3 | 2636.8 | 0.0 | 52.0 | 16.7 |
| small-laptop-slow | appearance | 3 | 695.3 | 82.0 | 92.0 | 66.6 |
| phone-portrait-slow | cold-entry | 3 | 4388.5 | 167.0 | 2237.8 | 66.7 |
| phone-portrait-slow | choose-project | 3 | 1648.3 | 0.0 | 0.0 | 16.7 |
| phone-portrait-slow | horizontal-gesture | 3 | 8742.0 | 0.0 | 0.0 | 16.8 |
| phone-portrait-slow | image-viewer | 3 | 2058.3 | 52.0 | 65.8 | 16.8 |
| phone-portrait-slow | vertical-navigation | 3 | 3512.5 | 0.0 | 0.0 | 16.7 |
| phone-portrait-slow | appearance | 3 | 767.9 | 74.0 | 86.3 | 66.7 |
| phone-landscape-slow | cold-entry | 3 | 4906.7 | 238.0 | 2243.8 | 50.0 |
| phone-landscape-slow | choose-project | 3 | 1669.5 | 0.0 | 0.0 | 16.8 |
| phone-landscape-slow | horizontal-gesture | 3 | 8829.8 | 0.0 | 0.0 | 16.8 |
| phone-landscape-slow | image-viewer | 3 | 2085.8 | 78.0 | 98.2 | 16.8 |
| phone-landscape-slow | vertical-navigation | 3 | 3266.2 | 0.0 | 0.0 | 16.8 |
| phone-landscape-slow | appearance | 3 | 744.5 | 82.0 | 84.6 | 66.8 |

## Release blockers

- Measurement environment changed. Recalibrate on the same machine/browser before comparing.
