"""
Generates PLACEHOLDER county resource profiles for the Resource profiles view.

The values are synthetic: a rough state-level base plus random variation, so the
front end can be built and tested before the team's real county table is ready.
Replace public/data/county_profiles.json with the real data (same fields, see
DATA_FORMAT.md) and delete this script's output.

Usage: python3 pipeline/make_mock_profiles.py <counties-10m.json> <county_population.csv>
"""
import csv
import json
import random
import sys
from pathlib import Path

random.seed(554)
topo_path, pop_path = sys.argv[1], sys.argv[2]
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "county_profiles.json"

STATES = {
    "01": "AL", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC",
    "12": "FL", "13": "GA", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
    "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO",
    "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC",
    "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "02": "AK", "15": "HI",
}
# rough commercial electricity price levels, cents/kWh (illustrative only)
PRICE = {"WA": 8, "OR": 9, "ID": 8, "MT": 10, "WY": 9, "ND": 9, "SD": 10, "NE": 9, "KS": 11, "OK": 8,
         "TX": 8, "LA": 9, "AR": 9, "MO": 10, "IA": 10, "MN": 11, "WI": 11, "IL": 10, "IN": 11, "OH": 10,
         "KY": 10, "TN": 11, "MS": 11, "AL": 12, "GA": 11, "FL": 11, "SC": 10, "NC": 9, "VA": 9, "WV": 10,
         "PA": 10, "NY": 16, "NJ": 13, "CT": 20, "RI": 19, "MA": 20, "VT": 17, "NH": 18, "ME": 15, "MD": 12,
         "DE": 11, "DC": 13, "MI": 12, "CA": 20, "NV": 9, "AZ": 11, "NM": 10, "UT": 9, "CO": 11, "AK": 20, "HI": 33}
WEST_DRY = {"AZ", "NV", "NM", "UT", "CA", "CO", "WY", "ID", "MT"}
HAZARD_HIGH = {"OK", "KS", "TX", "NE", "LA", "MS", "AL", "FL", "AR", "MO", "IA"}

pop = {}
with open(pop_path, newline="") as f:
    for row in csv.DictReader(f):
        pop[row["FIPS"].zfill(5)] = int(row["TOT_POP"])

topo = json.load(open(topo_path))
rows = []
for g in topo["objects"]["counties"]["geometries"]:
    fips = str(g["id"]).zfill(5)
    st = STATES.get(fips[:2])
    if not st:
        continue
    p = pop.get(fips, 20000)
    urban = min(1.0, max(0.0, (len(str(p)) - 3) / 4))  # 0 small rural .. 1 large metro
    price = PRICE[st] * random.uniform(0.85, 1.18)
    water = (0.08 if st in WEST_DRY else 0.32) * random.lognormvariate(0, 0.45)
    hazards = (1.6 if st in HAZARD_HIGH else 0.7) * random.lognormvariate(0, 0.5)
    fiber = min(99.0, max(2.0, 30 + 55 * urban + random.gauss(0, 14)))
    rec = {
        "fips": fips,
        "name": f"{g['properties']['name']} County, {st}",
        "state": st,
        "price": round(price, 2),
        "water": round(water, 4),
        "hazards": round(hazards, 3),
        "fiber": round(fiber, 1),
    }
    rows.append(rec)

# about 81 incomplete records, as in the design
for rec in random.sample(rows, 81):
    rec[random.choice(["price", "water", "hazards", "fiber"])] = None

OUT.write_text(json.dumps({
    "mock": True,
    "note": "Synthetic placeholder values. Replace with the team's county table.",
    "counties": rows,
}, separators=(",", ":")))
print(f"wrote {len(rows)} counties to {OUT}")
