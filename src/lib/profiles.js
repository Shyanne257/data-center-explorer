// Resource profiles: metric definitions, equal-frequency bins, weighted scores.

export const METRICS = [
  { key: 'price', label: 'Electricity price', unit: '¢/kWh', prefer: 'lower', fmt: (v) => `${v.toFixed(1)}¢` },
  { key: 'water', label: 'Modeled water', unit: 'm³/m²/yr', prefer: 'higher', fmt: (v) => v.toFixed(2) },
  { key: 'hazards', label: 'Recorded hazards', unit: 'events/mi²', prefer: 'lower', fmt: (v) => v.toFixed(2) },
  { key: 'fiber', label: 'Business fiber', unit: '%', prefer: 'higher', fmt: (v) => `${v.toFixed(0)}%` },
]
export const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]))

// Bins listed top to bottom on each axis.
export const BINS = ['Upper', 'Middle', 'Lower']
export const DEFAULT_WEIGHTS = { price: 4, water: 3, hazards: 2, fiber: 1 }
export const DEFAULT_ORDER = ['price', 'water', 'hazards', 'fiber']
export const DEFAULT_SELECTION = { price: 'Lower', water: 'Upper' }

const isComplete = (c) => METRICS.every((m) => c[m.key] != null)

// Equal-frequency terciles over complete records. Returns cut values and a bin per county.
function tercile(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  return [q(1 / 3), q(2 / 3)]
}

// Percentile rank in [0, 1] with ties sharing the average rank.
function percentiles(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const out = new Array(values.length)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1
    const r = (i + j) / 2 / Math.max(1, idx.length - 1)
    for (let k = i; k <= j; k += 1) out[idx[k][1]] = r
    i = j + 1
  }
  return out
}

export function prepareProfiles(raw) {
  const complete = raw.counties.filter(isComplete)
  const incomplete = raw.counties.filter((c) => !isComplete(c))
  // Real data ships bins and desirability from the database; mock data gets them computed here.
  const shipped = complete.length > 0 && complete.every((c) => c.bins && c.good)
  const cuts = {}
  const pct = {}
  for (const m of METRICS) {
    const vals = complete.map((c) => c[m.key])
    if (shipped) {
      // cut values = upper edge of the Lower and Middle bins
      const top = (bin) => Math.max(...complete.filter((c) => c.bins[m.key] === bin).map((c) => c[m.key]))
      cuts[m.key] = [top('Lower'), top('Middle')]
    } else {
      cuts[m.key] = tercile(vals)
      const p = percentiles(vals)
      // oriented so that 1 = preferred end of the metric
      pct[m.key] = p.map((x) => (m.prefer === 'lower' ? 1 - x : x))
    }
  }
  const counties = shipped
    ? complete
    : complete.map((c, i) => {
      const bins = {}
      const good = {}
      for (const m of METRICS) {
        const [a, b] = cuts[m.key]
        bins[m.key] = c[m.key] <= a ? 'Lower' : c[m.key] <= b ? 'Middle' : 'Upper'
        good[m.key] = pct[m.key][i]
      }
      return { ...c, bins, good }
    })
  return { counties, incomplete, cuts, mock: !!raw.mock, source: raw.source, byFips: new Map(raw.counties.map((c) => [c.fips, c])) }
}

export function weightShares(weights) {
  const total = METRICS.reduce((s, m) => s + weights[m.key], 0) || 1
  return Object.fromEntries(METRICS.map((m) => [m.key, weights[m.key] / total]))
}

export const scoreOf = (county, shares) =>
  100 * METRICS.reduce((s, m) => s + shares[m.key] * county.good[m.key], 0)

export const matches = (county, selection) =>
  Object.entries(selection).every(([k, bin]) => county.bins[k] === bin)

// "Lower electricity price + Upper modeled water"
export function selectionLabel(selection, order) {
  const parts = order
    .filter((k) => selection[k])
    .map((k) => `${selection[k]} ${METRIC[k].label.toLowerCase()}`)
  return parts.length ? parts.join(' + ') : 'No selection'
}

export function binRange(key, bin, cuts) {
  const m = METRIC[key]
  const [a, b] = cuts[key]
  if (bin === 'Lower') return `≤ ${m.fmt(a)}`
  if (bin === 'Middle') return `${m.fmt(a)}–${m.fmt(b)}`
  return `> ${m.fmt(b)}`
}
