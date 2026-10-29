# QA run 2026-10-29T18-15-00-867Z

Source: `5098b6fc493cfabcc5215f5dd40a8638e87e79cd4fb3e025ce72770af11d4fda`

Commit: `b9fcafc3b23b9eea96d9d73eb8b1ef152f027a67` (working-tree contents are captured by the source hash).

Environment: `{"platform":"darwin","osRelease":"27.0.0","arch":"arm64","cpu":"Apple M1 Pro","cores":10,"browserVersion":"156.0.8078.4","node":"v22.23.2"}`

Status: **blocked**. Unit checks: passed. Browser checks: passed.

Browser matrix: 106 passed, 0 failed, 14 skipped.

Values are medians of 3 runs, in milliseconds. Incomplete groups are not eligible as a baseline.

| Profile | Task | Samples | Task duration | Longest task | Longest animation frame | p95 frame gap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| desktop | cold-entry | 3 | 877.5 | 57.0 | 387.7 | 50.0 |
| desktop | choose-project | 3 | 1633.1 | 0.0 | 0.0 | 16.7 |
| desktop | horizontal-gesture | 3 | 1985.2 | 0.0 | 0.0 | 16.7 |
| desktop | image-viewer | 3 | 1812.0 | 0.0 | 0.0 | 16.7 |
| desktop | vertical-navigation | 3 | 3446.5 | 0.0 | 0.0 | 16.7 |
| desktop | appearance | 3 | 481.0 | 0.0 | 0.0 | 16.7 |
| small-laptop-slow | cold-entry | 3 | 4392.8 | 248.0 | 2223.3 | 50.1 |
| small-laptop-slow | choose-project | 3 | 1622.7 | 0.0 | 67.6 | 16.8 |
| small-laptop-slow | horizontal-gesture | 3 | 9013.5 | 0.0 | 60.9 | 16.7 |
| small-laptop-slow | image-viewer | 3 | 2027.3 | 74.0 | 89.2 | 16.8 |
| small-laptop-slow | vertical-navigation | 3 | 2631.3 | 0.0 | 54.3 | 16.8 |
| small-laptop-slow | appearance | 3 | 695.4 | 83.0 | 94.2 | 66.7 |
| phone-portrait-slow | cold-entry | 3 | 4175.0 | 140.0 | 2234.6 | 66.6 |
| phone-portrait-slow | choose-project | 3 | 1649.0 | 0.0 | 0.0 | 16.7 |
| phone-portrait-slow | horizontal-gesture | 3 | 8721.2 | 0.0 | 0.0 | 16.7 |
| phone-portrait-slow | image-viewer | 3 | 2016.9 | 0.0 | 52.5 | 16.8 |
| phone-portrait-slow | vertical-navigation | 3 | 3482.7 | 0.0 | 0.0 | 16.8 |
| phone-portrait-slow | appearance | 3 | 662.5 | 65.0 | 73.7 | 50.0 |
| phone-landscape-slow | cold-entry | 3 | 4461.3 | 271.0 | 2274.3 | 83.3 |
| phone-landscape-slow | choose-project | 3 | 1681.2 | 0.0 | 0.0 | 16.7 |
| phone-landscape-slow | horizontal-gesture | 3 | 8840.1 | 0.0 | 0.0 | 16.7 |
| phone-landscape-slow | image-viewer | 3 | 2049.7 | 87.0 | 107.0 | 16.8 |
| phone-landscape-slow | vertical-navigation | 3 | 3297.9 | 0.0 | 0.0 | 16.8 |
| phone-landscape-slow | appearance | 3 | 746.9 | 71.0 | 89.2 | 66.7 |

## Release blockers

- The baseline is incomplete or uses a different QA configuration.
