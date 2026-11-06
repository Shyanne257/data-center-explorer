import { useState } from 'react'
import { useReachabilityData } from '../lib/useReachabilityData.js'
import { CONDITIONS, THRESHOLDS, CATCH, ORANGE, GRAY, rgb, cssGradient } from '../lib/encoding.js'
import ReachabilityMap from './ReachabilityMap.jsx'
import DestinationPanel from './DestinationPanel.jsx'
import Dropdown from './Dropdown.jsx'

// Shareable views: ?mode=off|peak|delta&t=10|20|30&site=DC09
const params = new URLSearchParams(window.location.search)
const initialMode = Object.keys(CONDITIONS).includes(params.get('mode')) ? params.get('mode') : 'peak'
const initialT = THRESHOLDS.includes(Number(params.get('t'))) ? Number(params.get('t')) : 10

const LAYER_LABELS = {
  catchment: 'Network catchment',
  density: 'Population density',
  sites: 'Data centers',
}

export default function ReachabilityView() {
  const { data, error } = useReachabilityData()
  const [mode, setMode] = useState(initialMode)
  const [threshold, setThreshold] = useState(initialT)
  const [layers, setLayers] = useState({ catchment: true, density: true, sites: true, roads: false })
  const [topPercent, setTopPercent] = useState(10)
  const [site, setSite] = useState(params.get('site') || 'DC09')
  const [origin, setOrigin] = useState(null)

  if (error) return <div className="alert alert-danger">Could not load the reachability data: {String(error.message || error)}</div>
  if (!data) return <div className="text-center py-5"><div className="spinner-border text-secondary" role="status" /></div>

  const siteId = data.sites[site] ? site : data.siteList[0].id
  const T = threshold
  const steps = [0, Math.round(T / 3), Math.round((2 * T) / 3), T]

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3 reach-controls">
        <Dropdown label="Driving">
          <button type="button" className="dropdown-item active">Driving</button>
          <span className="dropdown-item-text small text-secondary">Walking and transit are not modeled: data centers are regional, car-access sites.</span>
        </Dropdown>
        <div className="btn-group" role="group" aria-label="Travel-time condition">
          {Object.entries(CONDITIONS).map(([k, label]) => (
            <button key={k} type="button" className={`btn ${mode === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
        <span className="small text-secondary ms-1">Threshold</span>
        <div className="btn-group" role="group" aria-label="Travel-time threshold">
          {THRESHOLDS.map((t) => (
            <button key={t} type="button" className={`btn ${T === t ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setThreshold(t)}>{t} min</button>
          ))}
        </div>
        <Dropdown label="Layers">
          <div className="px-3 py-1" style={{ minWidth: 240 }}>
            {Object.entries(LAYER_LABELS).map(([k, label]) => (
              <div className="form-check" key={k}>
                <input id={`ly-${k}`} type="checkbox" className="form-check-input" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />
                <label htmlFor={`ly-${k}`} className="form-check-label small">{label}</label>
              </div>
            ))}
            <label htmlFor="top-pct" className="form-label small mt-2 mb-0">Road flows: top <b>{topPercent}%</b> of roads</label>
            <input id="top-pct" type="range" className="form-range" min="1" max="100" value={topPercent} onChange={(e) => setTopPercent(Number(e.target.value))} />
          </div>
        </Dropdown>
        <div className="form-check form-switch border rounded px-3 py-2 ms-0 mb-0 d-flex align-items-center gap-2 road-switch">
          <label htmlFor="roads" className="form-check-label small">Road flows</label>
          <input id="roads" className="form-check-input ms-0" type="checkbox" role="switch" checked={layers.roads} onChange={(e) => setLayers({ ...layers, roads: e.target.checked })} />
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <label htmlFor="dest" className="small text-secondary text-nowrap">Destination:</label>
          <select id="dest" className="form-select form-select-sm fw-semibold" value={siteId} onChange={(e) => setSite(e.target.value)}>
            {data.siteList.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card dc-card overflow-hidden">
        <div className="row g-0">
          <div className="col-lg-8 border-end">
            <div className="position-relative reach-map">
              <ReachabilityMap
                data={data} mode={mode} threshold={T} layers={layers} topPercent={topPercent}
                site={siteId} origin={origin} onSite={(id) => { setSite(id); setOrigin(null) }} onOrigin={setOrigin}
              />
              <div className="map-chip">
                {mode === 'delta'
                  ? `Added minutes at peak · inside the off-peak ${T} min catchment`
                  : `${CONDITIONS[mode]} · ${T} min network catchment`}
              </div>
            </div>
            <div className="map-legend px-3 py-2 small">
              <div className="d-flex flex-wrap align-items-center gap-3">
                {mode === 'delta' ? (
                  <span className="d-flex align-items-center gap-2">
                    <b>Added minutes</b>
                    <span className="grad" style={{ background: cssGradient(ORANGE) }} /> 0 – 7+ min
                    <span className="key-outline" /> drops out at peak
                  </span>
                ) : (
                  <span className="d-flex align-items-center gap-2">
                    <b>Travel time (min)</b>
                    {CATCH.map((c, i) => (
                      <span key={i}><span className="key-sq" style={{ background: rgb(c) }} /> {steps[i]}–{steps[i + 1]}</span>
                    ))}
                  </span>
                )}
                <span className="d-flex align-items-center gap-1">
                  <b className="me-1">Population density</b> Low {GRAY.map((c, i) => <span key={i} className="key-sq wide" style={{ background: rgb(c) }} />)} High
                </span>
              </div>
              <div className="d-flex flex-wrap gap-3 mt-1 text-secondary">
                <span><span className="key-dot" /> Data center</span>
                <span><span className="key-dot dark" /> Example origin</span>
                <span><span className="key-line dark" /> Example (straight line)</span>
                <span><span className="key-line flow" /> Road flows (width ∝ √ residents)</span>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <DestinationPanel data={data} site={siteId} threshold={T} origin={origin} />
          </div>
        </div>
      </div>
    </>
  )
}
