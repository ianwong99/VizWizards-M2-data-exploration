# VizWizards – NBA 3-Point Era (Milestone 2)

This repository explores how the NBA transformed into a perimeter-first league. It combines local Basketball-Reference–derived CSVs with lightweight Python preprocessing and interactive D3.js prototypes that support both storytelling and exploratory analysis.

## Project Overview

Milestone 2 focuses on understanding the data and sketching the visualization narrative:

- **Problem:** The three-point shot’s gradual rise makes the strategic shift hard to see. We expose when, where, and why the league embraced threes—highlighting Stephen Curry’s catalytic role.
- **Deliverables:** Exploratory charts, a design document (`docs/design_doc.pdf`), and a D3-based prototype (`viz/`) covering league trends, player comparisons, positional changes, shot selection, and team adoption timelines.
- **Audience:** Classmates/instructors (presentation-first), basketball fans, analysts, and journalists seeking reusable visuals and insights.

## Repository Layout

```
NBA 1st dataset/
├── analysis/                # Python scripts + derived JSON summaries
├── docs/                    # Written design doc (Markdown + generated PDF)
├── figures/                 # Static SVG prototypes for quick sharing
├── viz/                     # D3.js exploratory prototypes (see README inside)
├── *.csv                    # Source data tables (Basketball-Reference via Kaggle)
└── README.md                # You are here
```

### Key Scripts & Assets

- `analysis/make_charts.py` – Generates the static SVG figures without heavy numeric deps.
- `analysis/build_pdf.py` – Pure-Python PDF generator (no LaTeX required) that draws the design doc.
- `analysis/*.json` – Aggregated summaries (league trends, Curry comparison, positional shares, player overlays, etc.) consumed by both SVGs and D3 charts.
- `viz/index.html` + `viz/js/charts.js` – Interactive D3 visualizations for league trend, volume vs efficiency, Curry vs league + custom players, positional share with player overlays, shot profile migration, and team adoption thresholds.

## Running the Interactive Prototype

All charts use local JSON summaries, so a static file server is required. From the repo root:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/viz/index.html](http://localhost:8000/viz/index.html) and experiment with the controls:

- **Curry vs League:** Add players (e.g., “Damian Lillard”) to plot their 3PA per game alongside Curry and league average.
- **Position Share:** Overlay up to five players to see how their personal league share evolved versus positional baselines.
- **Shot Profile Migration:** Read the legend and axis labels to track the collapse of midrange attempts as threes surged.

## Data Sources

All CSVs are bundled locally and were originally pulled from public Kaggle datasets referencing Basketball-Reference and NBA.com. Key tables:

| Dataset | Purpose | Notable columns |
| --- | --- | --- |
| `Team Stats Per Game.csv` | League/Team 3PA trends | `season`, `team`, `x3pa_per_game`, `x3p_percent` |
| `Team Summaries.csv` | Adoption timing vs success | `season`, `team`, `x3p_ar`, `n_rtg`, `w`, `l` |
| `Player Per Game.csv` | Player-level narratives | `season`, `player`, `team`, `x3pa_per_game`, `x3p_percent` |
| `Player Totals.csv` | Positional share + league contributions | `season`, `pos`, `x3pa` |
| `Player Shooting.csv` | Shot geography | `season`, `%` shares by zone, `avg_dist_fga` |

## Design Document

`docs/design_doc.pdf` outlines:

- Story rationale, target users, major questions.
- Visual storyboard (league era timeline → Curry spotlight → positional/shot geometry shifts → team adoption).
- Data inventory, risk assessment, and next steps heading into interactive refinement.

## Contributing / Next Steps

Planned enhancements include:

- Joining in salary data to explore compensation vs shooting value.
- Adding shot-coordinate heatmaps using pre-aggregated bins.
- Polishing the D3 prototype into a full scrollytelling experience (e.g., Observable or React build).

Feel free to open issues or PRs if you want to extend the analysis or visuals. For classroom use, clone the repo, run the scripts, and tailor the data stories to your team’s narrative.
