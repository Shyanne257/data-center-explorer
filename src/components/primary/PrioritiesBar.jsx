import { useState } from 'react'
import { METRICS, DEFAULT_WEIGHTS, weightShares } from '../../lib/profiles.js'

// Weights are edited as a draft and only change the ranking after "Apply weights".
export default function PrioritiesBar({ weights, onApply }) {
  const [mode, setMode] = useState('ratio')
  const [draft, setDraft] = useState(weights)

  const shares = weightShares(draft)
  const pct = (k) => Math.round(shares[k] * 100)
  const total = METRICS.reduce((s, m) => s + draft[m.key], 0)
  const totalPct = mode === 'percent' ? total : total ? 100 : 0
  const valid = mode === 'percent' ? total === 100 : total > 0
  const step = mode === 'percent' ? 5 : 1
  const max = mode === 'percent' ? 100 : 9

  function switchMode(next) {
    if (next === mode) return
    if (next === 'percent') {
      // convert ratio to percents that sum to 100
      const p = Object.fromEntries(METRICS.map((m) => [m.key, Math.round((shares[m.key] * 100) / 5) * 5]))
      const diff = 100 - METRICS.reduce((s, m) => s + p[m.key], 0)
      p[METRICS[0].key] += diff
      setDraft(p)
    } else {
      setDraft({ ...weights })
    }
    setMode(next)
  }

  const change = (k, d) => setDraft({ ...draft, [k]: Math.max(0, Math.min(max, draft[k] + d)) })

  return (
    <div className="card dc-card mb-4">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-4 align-items-start">
          <div>
            <div className="fw-semibold fs-6 mb-2">Your priorities</div>
            <div className="btn-group btn-group-sm" role="group" aria-label="Weight input mode">
              <button type="button" className={`btn ${mode === 'ratio' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => switchMode('ratio')}>Ratio</button>
              <button type="button" className={`btn ${mode === 'percent' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => switchMode('percent')}>Percent</button>
            </div>
          </div>
          {METRICS.map((m) => (
            <div key={m.key}>
              <label className="small mb-2 d-block" id={`w-${m.key}`}>{m.label}</label>
              <div className="d-flex align-items-center gap-2">
                <div className="input-group input-group-sm stepper" role="group" aria-labelledby={`w-${m.key}`}>
                  <button type="button" className="btn btn-outline-secondary" aria-label={`Decrease ${m.label}`} onClick={() => change(m.key, -step)}>−</button>
                  <span className="form-control text-center fw-semibold">{draft[m.key]}</span>
                  <button type="button" className="btn btn-outline-secondary" aria-label={`Increase ${m.label}`} onClick={() => change(m.key, step)}>+</button>
                </div>
                {mode === 'ratio' && <span className="badge rounded-pill pct-badge">{pct(m.key)}%</span>}
              </div>
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 pt-4">
            <span className="small text-secondary">Total</span>
            <span className={`badge rounded-pill ${valid ? 'text-bg-success-subtle text-success' : 'text-bg-danger-subtle text-danger'}`}>{totalPct}%</span>
          </div>
          <div className="d-grid gap-2 ms-xl-auto" style={{ minWidth: 140 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={!valid} onClick={() => onApply(mode === 'percent' ? draft : { ...draft })}>Apply weights</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setMode('ratio'); setDraft(DEFAULT_WEIGHTS); onApply(DEFAULT_WEIGHTS) }}>Reset</button>
          </div>
        </div>
        <div className="small text-secondary mt-3">
          Default 4:3:2:1. Weights change county ranking, not ribbon widths; ribbon width represents county count.
          {!valid && mode === 'percent' && <span className="text-danger ms-2">Percentages must add up to 100.</span>}
        </div>
      </div>
    </div>
  )
}
