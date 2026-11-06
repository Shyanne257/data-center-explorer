# Data format

## Resource profiles (primary challenge)

`public/data/county_profiles.json` is exported from the team's database handoff
(`DSCI554_Frontend_DB_2026-11-04`, profile `resource_profiles_v1`, file
`csv/metric_values_with_provenance.csv`). To refresh it after a new release:

```sh
python3 frontend_data/export_profiles.py /path/to/DSCI554_Frontend_DB_2026-11-04
```

```json
{
  "mock": false,
  "source": "DSCI554_Frontend_DB_2026-11-04, resource_profiles_v1",
  "metrics": { "price": { "label": "...", "unit": "...", "period": "...", "definition": "...", "limits": "..." } },
  "counties": [
    { "fips": "01001", "name": "Autauga County, AL", "state": "AL",
      "price": 7.73, "water": 0.2896, "hazards": 4.394, "fiber": 59.49,
      "bins": { "price": "Middle", "water": "Upper", "hazards": "Middle", "fiber": "Middle" },
      "good": { "price": 0.6326, "water": 0.7364, "hazards": 0.3605, "fiber": 0.5385 } }
  ]
}
```

| Field | Unit | Preferred | Meaning |
| --- | --- | --- | --- |
| `price` | ¢/kWh (converted from USD/kWh) | lower | State industrial electricity price, EIA 2025 |
| `water` | m³/m²/year | higher | Modeled remaining water depth, AWARE-US |
| `hazards` | events/mi² | lower | Recorded natural-hazard event density, FEMA NRI |
| `fiber` | % | higher | Business-location fiber availability ≥100/20 Mbps, FCC |

`bins` and `good` (desirability, 0 to 1, 1 = preferred end) come from the database and are not
recomputed in the browser. The weighted score is `100 × Σ weight × good`, which reproduces the
database rankings (for example 4:3:2:1 within Lower price + Upper water: Chelan 87.5, McCurtain 85.8,
Snohomish 85.7). Counties with a missing metric have `null` values and no bins: 3,063 complete and 81
incomplete. County shapes come from `public/data/counties-10m.json` (us-atlas v3), matched on `fips`.

## Dallas reachability

The reachability view reads five static files from `public/data/`. To connect new pipeline output, replace
these files with the same names and fields; no code changes are needed. The current files come from
Shreya's reachability pipeline and match the database release (800 origins, 22 destinations, exact
10-minute flags; DC09 off-peak 556,770 and peak 333,776 residents).

## `blockgroups.geojson`

GeoJSON FeatureCollection, one Polygon/MultiPolygon per census block group.

| Property | Type | Meaning |
| --- | --- | --- |
| `g` | string | Block group GEOID (12 digits) |
| `pop` | number | Population (ACS 2019–2023) |
| `inc` | string | Income tercile: `Lower`, `Middle`, `Higher`, or `Unknown` |
| `income` | number or null | Median household income |
| `to` | number | Off-peak minutes to the nearest data center |
| `tp` | number | Estimated peak minutes to the nearest data center |
| `d` | number | Added minutes at peak (`tp - to`) |
| `no` | string | Nearest site id off-peak, e.g. `DC10` |
| `np` | string | Nearest site id at peak (can differ from `no`) |
| `c` | [lon, lat] | Centroid, start of the commute arc |

## `routes.geojson`

GeoJSON FeatureCollection of LineStrings: road segments used by the shortest routes.

| Property | Type | Meaning |
| --- | --- | --- |
| `fo` | number | Residents routed over the segment off-peak |
| `fp` | number | Residents routed over the segment at peak |
| `h` | string | OSM highway class (`motorway`, `primary`, ...) |
| `n` | string or null | Road name |

## `sites.json`

Object keyed by site id.

```json
{ "DC10": { "name": "Live Oak Data Center", "op": null, "n": 1, "c": [-96.79457, 32.78371], "po": 587597, "pp": 330142 } }
```

`op` operator, `n` number of merged OSM buildings, `c` [lon, lat], `po` / `pp` residents within the
threshold of this site off-peak / at peak.

## `catchments.json`

Object keyed by site id, then by block group GEOID: `[offPeakMinutes, peakMinutes, withinMask]`.
`withinMask` bit 0 = within the threshold off-peak, bit 1 = within the threshold at peak
(0 = neither, 1 = off-peak only, 2 = peak only, 3 = both). Clicking a site shows the block groups
whose bit is set for the current condition.

```json
{ "DC10": { "481130003001": [4.2, 5.6, 3] } }
```

## `summary.json`

```json
{
  "threshold": 10, "tti": 1.27, "k": 0.435,
  "bounds": [west, south, east, north],
  "summary": {
    "off":  { "All": {...}, "Lower": {...}, "Middle": {...}, "Higher": {...}, "Unknown": {...} },
    "peak": { ... }
  }
}
```

Each group holds `population`, `n_block_groups`, `pop_within_threshold`, `pct_within_threshold`,
`median_minutes`, `pop_weighted_mean_minutes`. The side table (Table 1 in the paper) reads
`pct_within_threshold` and `median_minutes` from here.
