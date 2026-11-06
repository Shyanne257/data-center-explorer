"""
Exports the four-metric county resource profiles for the front end.

Reads the team's database handoff CSV (no server needed) and writes
public/data/county_profiles.json in the format described in DATA_FORMAT.md.

Usage:
    python3 frontend_data/export_profiles.py /path/to/DSCI554_Frontend_DB_2026-11-04

Source: csv/metric_values_with_provenance.csv (profile resource_profiles_v1).
Bins (lower/middle/upper) and desirability come from the database; the browser
does not recompute them. Electricity price is converted from USD/kWh to ¢/kWh.
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

STATE_ABBR = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
    "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
    "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
    "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
    "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
    "54": "WV", "55": "WI", "56": "WY",
}
BIN = {"lower": "Lower", "middle": "Middle", "upper": "Upper"}
SCALE = {"price": 100.0}  # USD/kWh -> cents/kWh


def num(x):
    return None if x in ("", None) else float(x)


def main(root):
    root = Path(root)
    src = root / "csv" / "metric_values_with_provenance.csv"
    out = Path(__file__).resolve().parent.parent / "public" / "data" / "county_profiles.json"

    counties = {}
    meta = {}
    for r in csv.DictReader(open(src, encoding="utf-8-sig")):
        if r["profile_id"] != "resource_profiles_v1":
            continue
        f = r["county_fips"].zfill(5)
        k = r["metric_key"]
        c = counties.setdefault(f, {
            "fips": f,
            "name": f"{r['name']}, {STATE_ABBR.get(r['state_fips'], r['state_fips'])}",
            "state": STATE_ABBR.get(r["state_fips"], r["state_fips"]),
            "bins": {}, "good": {},
        })
        v = num(r["value"])
        complete = r["is_complete"] == "1" and v is not None and r["bin_key"] in BIN
        c[k] = None if not complete else round(v * SCALE.get(k, 1.0), 6)
        if complete:
            c["bins"][k] = BIN[r["bin_key"]]
            c["good"][k] = round(float(r["desirability"]), 6)
        if k not in meta:
            meta[k] = {"label": r["label"], "unit": r["unit"], "period": r["reference_period"],
                       "definition": r["definition"], "limits": r["limits"]}

    rows = sorted(counties.values(), key=lambda c: c["fips"])
    n_complete = sum(1 for c in rows if len(c["bins"]) == 4)
    out.write_text(json.dumps({
        "mock": False,
        "source": "DSCI554_Frontend_DB_2026-11-04, resource_profiles_v1",
        "metrics": meta,
        "counties": rows,
    }, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {len(rows)} counties ({n_complete} complete) to {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
