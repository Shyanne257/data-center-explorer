import { useMemo } from 'react'
import { fmt, fmtK } from '../lib/encoding.js'

const GROUPS = ['Lower', 'Middle', 'Higher']

// Minutes are stored rounded to 0.1, so at the paper's 10-minute threshold we use the
// pipeline's exact within-threshold flags (mask bits) instead of re-testing rounded minutes.
const within = (e, i, T, meta) => (T === meta.threshold ? ((e[2] >> i) & 1) === 1 : e[i] <= T)

// Residents within the threshold of one site, off-peak and at peak, overall and by income.
function reachOf(data, site, T) {
  const c = data.catchments[site]
  const r = { off: 0, peak: 0, inc: {} }
  for (const f of data.blockGroups.features) {
    const p = f.properties
    const e = c[p.g]
    if (!e) continue
    const o = within(e, 0, T, data.meta)
    const k = within(e, 1, T, data.meta)
    if (!r.inc[p.inc]) r.inc[p.inc] = { off: 0, peak: 0 }
    if (o) { r.off += p.pop; r.inc[p.inc].off += p.pop }
    if (k) { r.peak += p.pop; r.inc[p.inc].peak += p.pop }
  }
  return r
}

// Share of residents within T minutes of their nearest data center, citywide and by income.
// At the paper's threshold this is the pipeline summary (Table 1); otherwise it is computed.
function citywide(data, T) {
  if (T === data.meta.threshold) {
    const out = {}
    for (const k of ['All', 'Lower', 'Middle', 'Higher']) {
      const o = data.meta.summary.off[k]
      const p = data.meta.summary.peak[k]
      out[k] = { pop: 100, off: o.pct_within_threshold, peak: p.pct_within_threshold }
    }
    return out
  }
  const tot = {}
  for (const f of data.blockGroups.features) {
    const p = f.properties
    for (const k of ['All', p.inc]) {
      tot[k] ??= { pop: 0, off: 0, peak: 0 }
      tot[k].pop += p.pop
      if (p.to <= T) tot[k].off += p.pop
      if (p.tp <= T) tot[k].peak += p.pop
    }
  }
  return tot
}

export default function DestinationPanel({ data, site, threshold, origin }) {
  const s = data.sites[site]
  const r = useMemo(() => reachOf(data, site, threshold), [data, site, threshold])
  const city = useMemo(() => citywide(data, threshold), [data, threshold])
  // shared axis across sites so bars compare between destinations
  const axisMax = useMemo(() => {
    const m = Math.max(...data.siteList.map((x) => reachOf(data, x.id, threshold).off))
    return Math.ceil(m / 200000) * 200000 || 200000
  }, [data, threshold])
  const change = r.off ? ((r.peak - r.off) / r.off) * 100 : 0
  const o = origin && data.blockGroups.byId[origin]
  const oc = o && data.catchments[site][origin]

  return (
    <div className="p-4">
      <div className="eyebrow">Selected destination</div>
      <h3 className="h3 fw-bold mb-0">{site} · {s.name}</h3>
      <div className="text-secondary small mb-3">
        Reachable within {threshold} minutes{s.op ? ` · ${s.op}` : ''} · {s.n} mapped building{s.n > 1 ? 's' : ''}
      </div>

      <div className="fw-semibold mb-2">Population reachable</div>
      {[['Off-peak', r.off, 'bar-off'], ['Estimated peak', r.peak, 'bar-peak']].map(([label, v, cls]) => (
        <div key={label} className="mb-2">
          <div className="small fw-semibold">{label}</div>
          <div className="d-flex align-items-center gap-2">
            <div className="pop-bar flex-grow-1"><span className={cls} style={{ width: `${(v / axisMax) * 100}%` }} /></div>
            <span className="fw-semibold pop-num">{fmt(v)}</span>
          </div>
        </div>
      ))}
      <div className="d-flex justify-content-between axis-ticks me-5 pe-4">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <span key={t}>{fmtK(axisMax * t)}</span>)}
      </div>
      <div className="small text-secondary mt-2">
        Same destination and {threshold}-minute threshold for both scenarios: {change.toFixed(0)}% at peak.
        By income at peak: {GROUPS.map((g) => `${g.toLowerCase()} ${fmt(r.inc[g]?.peak || 0)}`).join(' · ')}.
      </div>

      <div className="alert alert-warning small py-2 mt-3 mb-3">
        <div className="fw-semibold">Peak is modeled, not observed traffic.</div>
        Free-flow times scaled by road class to a Travel Time Index of {data.meta.tti} (Dallas–Fort Worth).
      </div>

      <div className="fw-semibold">Network-based, not a distance buffer</div>
      <p className="small text-secondary">
        Driving time from census block-group origins to mapped data centers over the OpenStreetMap road network,
        so the catchment follows roads rather than a circle.
      </p>

      <div className="origin-card p-3 mb-3">
        {o ? (
          <>
            <div className="small fw-semibold">Example origin → {site} · {s.name}</div>
            <div className="d-flex justify-content-between small mt-1">
              <span>Off-peak <b>{oc[0]} min</b></span>
              <span>Estimated peak <b>{oc[1]} min</b></span>
            </div>
            <div className="small text-secondary mt-1">
              Block group {origin.slice(-7)} · {fmt(o.properties.pop)} residents · {o.properties.inc} income.
              The line is straight; the times follow the road network.
            </div>
          </>
        ) : (
          <div className="small text-secondary">Click any block group on the map to see its drive time to this data center.</div>
        )}
      </div>

      <div className="fw-semibold small mb-1">Citywide: residents within {threshold} min of any data center</div>
      <table className="table table-sm small mb-0">
        <thead><tr><th /><th className="text-end">Off-peak</th><th className="text-end">Peak</th><th className="text-end">Change</th></tr></thead>
        <tbody>
          {[...GROUPS, 'All'].map((g) => {
            const t = city[g]
            const a = (t.off / t.pop) * 100
            const b = (t.peak / t.pop) * 100
            return (
              <tr key={g} className={g === 'All' ? 'fw-semibold' : undefined}>
                <td>{g === 'All' ? 'All Dallas' : `${g} income`}</td>
                <td className="text-end">{a.toFixed(1)}%</td>
                <td className="text-end">{b.toFixed(1)}%</td>
                <td className="text-end text-danger">{(b - a).toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
