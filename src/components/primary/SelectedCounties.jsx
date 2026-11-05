import { useMemo, useState } from 'react'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import { METRICS, matches, scoreOf, selectionLabel, weightShares } from '../../lib/profiles.js'

const MW = 480
const MH = 300

export default function SelectedCounties({ data, topo, order, selection, weights, onClear }) {
  const [hover, setHover] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [howOpen, setHowOpen] = useState(false)

  // county shapes are projected once
  const shapes = useMemo(() => {
    const counties = feature(topo, topo.objects.counties).features
    const nation = feature(topo, topo.objects.nation)
    const projection = geoAlbersUsa().fitSize([MW, MH], nation)
    const path = geoPath(projection)
    return {
      counties: counties.map((f) => ({ fips: String(f.id).padStart(5, '0'), d: path(f) })).filter((c) => c.d),
      states: path(mesh(topo, topo.objects.states, (a, b) => a !== b)),
    }
  }, [topo])

  const byFips = useMemo(() => new Map(data.counties.map((c) => [c.fips, c])), [data])
  const shares = weightShares(weights)
  const selected = useMemo(() => {
    const list = data.counties.filter((c) => matches(c, selection))
    return list.map((c) => ({ ...c, score: scoreOf(c, shares) })).sort((a, b) => b.score - a.score)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selection, weights])
  const selSet = useMemo(() => new Set(selected.map((c) => c.fips)), [selected])
  const hasSel = Object.keys(selection).length > 0
  const top = selected.slice(0, showAll ? 10 : 3)
  const hoverRec = hover && (byFips.get(hover) || data.byFips.get(hover))

  return (
    <div className="card dc-card h-100">
      <div className="card-body">
        <h3 className="h5 mb-0">Selected counties</h3>
        <div className="small text-secondary mb-2">Selection is linked to the map and ranking.</div>
        <div className="mini-map position-relative">
          <div className="mini-map-label">United States · county selection</div>
          <svg viewBox={`0 0 ${MW} ${MH}`} className="w-100" role="img" aria-label="Map of selected counties">
            {shapes.counties.map((c) => {
              const rec = byFips.get(c.fips)
              const cls = !rec ? 'cty missing' : hasSel && selSet.has(c.fips) ? 'cty sel' : 'cty'
              return <path key={c.fips} d={c.d} className={cls} onMouseEnter={() => setHover(c.fips)} onMouseLeave={() => setHover(null)} />
            })}
            <path d={shapes.states} className="state-lines" />
          </svg>
          <div className="mini-map-foot">
            {hoverRec ? (
              <span>
                <b>{hoverRec.name}</b>{' '}
                {METRICS.map((m) => `${m.label.split(' ')[1] || m.label}: ${hoverRec[m.key] == null ? 'missing' : m.fmt(hoverRec[m.key])}`).join(' · ')}
              </span>
            ) : (
              <span>{data.mock ? 'Mock selection · illustrative county bins' : 'Hover a county for its values'}</span>
            )}
          </div>
        </div>

        <div className="h2 fw-bold mt-3 mb-1">{hasSel ? selected.length.toLocaleString() : 0} counties selected</div>
        <div className="small text-secondary">{selectionLabel(selection, order)}</div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span className="small text-secondary"><span className="sel-dot" /> Selected{data.mock ? ' · mock' : ''}</span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClear} disabled={!hasSel}>Clear selection</button>
        </div>

        <hr />
        <div className="fw-semibold">Ranked by your weights</div>
        <div className="small text-secondary mb-2">Within selection · weighted score / 100{data.mock ? ' · mock' : ''}</div>
        {!hasSel && <div className="small text-secondary">Select a bin or ribbon to rank its counties.</div>}
        <ol className="list-unstyled mb-2 rank-list">
          {hasSel && top.map((c, i) => (
            <li key={c.fips} className="d-flex align-items-center gap-2 small mb-2"
              onMouseEnter={() => setHover(c.fips)} onMouseLeave={() => setHover(null)}>
              <span className="text-secondary rank-n">{i + 1}</span>
              <span className="rank-name text-truncate">{c.name}</span>
              <span className="rank-bar flex-grow-1"><span style={{ width: `${c.score}%` }} /></span>
              <span className="fw-semibold rank-score">{c.score.toFixed(1)}</span>
            </li>
          ))}
        </ol>
        {hasSel && selected.length > 3 && (
          <button type="button" className="btn btn-link btn-sm p-0 me-3" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show top 3' : 'Show top 10'}
          </button>
        )}
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setHowOpen(!howOpen)} aria-expanded={howOpen}>
          ⓘ How scoring works
        </button>
        {howOpen && (
          <div className="small text-secondary mt-2">
            Each metric is turned into a percentile among the {data.counties.length.toLocaleString()} complete counties,
            flipped where lower is preferred (price, hazards), so 1 is always the preferred end. The score is the
            weighted average of the four percentiles times 100, using your weights
            ({METRICS.map((m) => `${Math.round(shares[m.key] * 100)}%`).join(' / ')}). Counties with any missing value are
            not scored.
          </div>
        )}
      </div>
    </div>
  )
}
