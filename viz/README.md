# NBA 3-Point Era – D3 Prototypes

This directory contains interactive versions of the exploratory charts built with D3.js. They read the pre-computed JSON summaries stored under `../analysis/`.

## Usage

1. From the project root, start a static server (needed so `fetch` can read the local JSON files). For example:
   ```bash
   python3 -m http.server 8000
   ```
2. Open a browser to [`http://localhost:8000/viz/index.html`](http://localhost:8000/viz/index.html).
3. Hover over marks to view tooltips. Layout adapts to the viewport width.

The original static SVG exports are still available in the `figures/` directory for slide-ready assets.

## Data Inputs

Although the charts read precomputed JSON summaries from `analysis/`, each summary is derived directly from the CSVs included in the `NBA 1st dataset/` directory:

| Chart | Source CSV(s) | Attributes leveraged |
| --- | --- | --- |
| League Three-Point Attempts & Accuracy | `Team Stats Per Game.csv` | `season`, `x3pa_per_game`, `x3p_percent` |
| Volume vs Efficiency Snapshots | `Team Stats Per Game.csv` | `season`, `team`, `x3pa_per_game`, `x3p_percent` |
| Stephen Curry vs League Average | `Player Per Game.csv` | `season`, `player`, `team`, `x3pa_per_game`, `x3p_percent` |
| Share of League 3PA by Position | `Player Totals.csv` | `season`, `pos`, `x3pa` |
| Shot Profile Migration | `Player Shooting.csv` | `season`, `percent_fga_from_x3p_range`, `percent_fga_from_x10_16_range`, `percent_fga_from_x16_3p_range`, `avg_dist_fga` |
| Team Adoption of ≥40% 3PA Rate | `Team Summaries.csv` | `season`, `team`, `x3p_ar`, `n_rtg`, `w`, `l` |

Refer to the scripts in `analysis/` for exact aggregation logic that produces the JSON files consumed here.
