# Where Should Data Centers Go, and Who Can Reach Them?

DSCI 554 Team 15 demo, a single page with two sections that follow the team's Figma design.

## 01 Resource profiles (primary challenge)

- **Your priorities**: weights for electricity price, modeled water, recorded hazards and business
  fiber, entered as a ratio (default 4:3:2:1) or as percentages, applied with *Apply weights*.
- **Parallel sets** over equal-frequency bins (Upper / Middle / Lower) for the 3,061 complete
  counties. Ribbon width is the county count. Click a bin or ribbon to select counties, shift-click to
  add a condition, *View bins* shows the cut values, and axes can be reordered by dragging their titles
  or with *Reorder axes*.
- **Selected counties**: a linked U.S. county map and a ranking of the selection by weighted score.
  Incomplete records are gray and never scored.
- Real county data from the team's database release (`resource_profiles_v1`): 3,063 complete and 81
  incomplete counties. Refresh it with `python3 frontend_data/export_profiles.py <release folder>`.

## 02 Dallas reachability (reachability challenge)

- Drive time from 800 Dallas block groups to 22 data centers mapped in OpenStreetMap.
- **Conditions**: off-peak, estimated peak, and added minutes at peak. **Thresholds**: 10, 20, 30 min.
- **Destination**: pick a data center (list or map click). Its network catchment is colored in three
  travel-time steps; other block groups show population density in gray. In the added-minutes view,
  block groups that drop out of the catchment at peak are outlined.
- **Road flows** toggle: roads used by the shortest routes, width ∝ √ residents routed, limited to
  the top percent of roads (Layers menu) to control overplotting.
- **Example origin**: click a block group to see its off-peak and peak time to the destination.
- **Panel**: residents reachable off-peak versus peak, by income, and the citywide table
  (paper Table 1).
- Shareable views: `?mode=off|peak|delta&t=10|20|30&site=DC09`.

## Tech stack

React 19, Bootstrap 5, D3 (d3-geo) for the parallel sets and county map, deck.gl 9 (`GeoJsonLayer`, `LineLayer`, `ScatterplotLayer`) over a MapLibre GL
basemap (OpenFreeMap Positron), built with Vite. Drive times are precomputed offline with OSMnx and
NetworkX and shipped as static files in `public/data/`; see [frontend_data/DATA_FORMAT.md](frontend_data/DATA_FORMAT.md).

## Setup and usage

Requires the current Node LTS.

```bash
npm install
npm run dev       # development server at http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes the site to GitHub Pages on every push to
`main`. In the repository settings, set **Pages > Source** to **GitHub Actions**. `vite.config.js`
uses `base: './'`, so the site works under `https://<user>.github.io/<repo>/`.

## Project structure

```
src/
  App.jsx                              page layout and header
  components/primary/                  Resource profiles: PrioritiesBar, ParallelSets, SelectedCounties
  components/ReachabilityView.jsx      reachability controls and layout
  components/ReachabilityMap.jsx       MapLibre map and deck.gl layers
  components/DestinationPanel.jsx      selected destination, reach, citywide table
  components/Dropdown.jsx              small Bootstrap dropdown
  lib/profiles.js                      metrics, bins, weighted score
  lib/encoding.js                      reachability colors and helpers
  lib/useReachabilityData.js           loads public/data/
public/data/                           data files (see DATA_FORMAT.md)
frontend_data/export_profiles.py       exports county data from the database release
```

## Data sources

County profiles: EIA state industrial electricity price (2025), AWARE-US modeled water, FEMA National
Risk Index hazard events, FCC business fiber availability. Dallas: U.S. Census Bureau ACS 2019–2023 and TIGER/Line 2023; OpenStreetMap contributors (ODbL), retrieved
with OSMnx; 2015 Urban Mobility Scorecard (Travel Time Index 1.27 for Dallas–Fort Worth–Arlington).
Peak times are modeled estimates, not observed traffic.
