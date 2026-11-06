import { useMemo, useRef, useState } from 'react'
import { METRIC, BINS, binRange, matches, selectionLabel } from '../../lib/profiles.js'

// Parallel sets over equal-frequency bins. Bands show attribute combinations
// (county counts), not movement. Click a bin or ribbon to select counties;
// shift-click adds a condition. Drag an axis title (or use Reorder axes) to reorder.
const W = 860
const TOP = 96
const BOTTOM = 470
const BIN_W = 56
const GAP = 22
const PAD_X = 20

export default function ParallelSets({ data, order, setOrder, selection, onSelect }) {
  const { counties, incomplete, cuts } = data
  const [showRanges, setShowRanges] = useState(false)
  const [reorder, setReorder] = useState(false)
  const [hover, setHover] = useState(null)
  const [drag, setDrag] = useState(null)
  const svgRef = useRef(null)

  const spacing = (W - 2 * PAD_X - BIN_W) / (order.length - 1)
  const axisX = (i) => PAD_X + i * spacing
  const scale = (BOTTOM - TOP - GAP * (BINS.length - 1)) / counties.length

  const layout = useMemo(() => {
    // bin rectangles per axis
    const bins = {}
    for (const key of order) {
      let y = TOP
      bins[key] = {}
      for (const b of BINS) {
        const n = counties.filter((c) => c.bins[key] === b).length
        bins[key][b] = { y, h: n * scale, n, sel: 0 }
        y += n * scale + GAP
      }
    }
    // ribbons per adjacent axis pair, stacked inside source and target bins
    const ribbons = []
    order.slice(0, -1).forEach((ka, i) => {
      const kb = order[i + 1]
      const n = {}
      const s = {}
      for (const c of counties) {
        const id = `${c.bins[ka]}|${c.bins[kb]}`
        n[id] = (n[id] || 0) + 1
        if (matches(c, selection)) s[id] = (s[id] || 0) + 1
      }
      const srcOff = Object.fromEntries(BINS.map((b) => [b, bins[ka][b].y]))
      const tgtOff = Object.fromEntries(BINS.map((b) => [b, bins[kb][b].y]))
      const placed = {}
      for (const a of BINS) for (const b of BINS) {
        const id = `${a}|${b}`
        placed[id] = { y0: srcOff[a] }
        srcOff[a] += (n[id] || 0) * scale
      }
      for (const b of BINS) for (const a of BINS) {
        const id = `${a}|${b}`
        placed[id].y1 = tgtOff[b]
        tgtOff[b] += (n[id] || 0) * scale
      }
      for (const a of BINS) for (const b of BINS) {
        const id = `${a}|${b}`
        if (!n[id]) continue
        ribbons.push({ i, ka, kb, a, b, n: n[id], s: s[id] || 0, ...placed[id] })
      }
    })
    for (const c of counties) {
      if (!matches(c, selection)) continue
      for (const key of order) bins[key][c.bins[key]].sel += 1
    }
    return { bins, ribbons }
  }, [counties, order, selection, scale])

  const band = (x0, x1, y0, y1, w) => {
    const xm = (x0 + x1) / 2
    return `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + w}C${xm},${y1 + w} ${xm},${y0 + w} ${x0},${y0 + w}Z`
  }

  const choose = (cond, e) => {
    const same = Object.keys(cond).length === Object.keys(selection).length &&
      Object.entries(cond).every(([k, v]) => selection[k] === v)
    if (e.shiftKey) onSelect({ ...selection, ...cond })
    else onSelect(same ? {} : cond)
  }

  const moveAxis = (key, dir) => {
    const i = order.indexOf(key)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  // drag axis titles
  const toSvgX = (e) => {
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svgRef.current.getScreenCTM().inverse()).x
  }
  const onDown = (key, e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ key, start: toSvgX(e), dx: 0 })
  }
  const onMove = (e) => drag && setDrag({ ...drag, dx: toSvgX(e) - drag.start })
  const onUp = () => {
    if (!drag) return
    const from = order.indexOf(drag.key)
    const to = Math.max(0, Math.min(order.length - 1, Math.round((axisX(from) + drag.dx - PAD_X) / spacing)))
    if (to !== from) {
      const next = order.filter((k) => k !== drag.key)
      next.splice(to, 0, drag.key)
      setOrder(next)
    }
    setDrag(null)
  }

  const selectedCount = counties.filter((c) => matches(c, selection)).length
  const hasSel = Object.keys(selection).length > 0

  return (
    <div className="card dc-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-end gap-2 mb-1">
          <button type="button" className={`btn btn-sm ${showRanges ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setShowRanges(!showRanges)}>View bins</button>
          <button type="button" className={`btn btn-sm ${reorder ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setReorder(!reorder)}>↶ Reorder axes</button>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${BOTTOM + 10}`} className="w-100 psets" role="img"
          aria-label="Parallel sets of county resource bins" onPointerMove={onMove} onPointerUp={onUp}>
          {/* ribbons */}
          {layout.ribbons.map((r) => {
            const x0 = axisX(r.i) + BIN_W
            const x1 = axisX(r.i + 1)
            const isHover = hover && hover.ka === r.ka && hover.a === r.a && hover.b === r.b && hover.i === r.i
            return (
              <g key={`${r.ka}-${r.a}-${r.b}`}>
                <path d={band(x0, x1, r.y0, r.y1, r.n * scale)} className={`ribbon ${isHover ? 'hover' : ''}`}
                  onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)}
                  onClick={(e) => choose({ [r.ka]: r.a, [r.kb]: r.b }, e)} />
                {r.s > 0 && (
                  <path d={band(x0, x1, r.y0, r.y1, r.s * scale)} className="ribbon-sel" pointerEvents="none" />
                )}
              </g>
            )
          })}
          {/* axes */}
          {order.map((key, i) => {
            const m = METRIC[key]
            const dx = drag?.key === key ? drag.dx : 0
            const x = axisX(i) + dx
            return (
              <g key={key} className={drag?.key === key ? 'axis dragging' : 'axis'}>
                <g className="axis-title" transform={`translate(${x},0)`} onPointerDown={(e) => onDown(key, e)}>
                  <title>Drag to reorder</title>
                  {/* the last title is right-aligned so it stays inside the chart */}
                  <g textAnchor={i === order.length - 1 ? 'end' : 'start'} transform={`translate(${i === order.length - 1 ? BIN_W : 0},0)`}>
                    <text x={0} y={22} className="axis-label">{m.label}</text>
                    <text x={0} y={40} className="axis-sub">{m.prefer === 'lower' ? 'Lower preferred' : 'Higher preferred'}</text>
                    <text x={0} y={56} className="axis-unit">{m.unit}</text>
                  </g>
                </g>
                {reorder && (
                  <g transform={`translate(${axisX(i)},66)`}>
                    {i > 0 && <text x={0} y={12} className="axis-move" onClick={() => moveAxis(key, -1)}>◀ left</text>}
                    {i < order.length - 1 && <text x={i > 0 ? 50 : 0} y={12} className="axis-move" onClick={() => moveAxis(key, 1)}>right ▶</text>}
                  </g>
                )}
                {BINS.map((b) => {
                  const bin = layout.bins[key][b]
                  const active = selection[key] === b
                  return (
                    <g key={b} transform={`translate(${x},${bin.y})`} className="bin" onClick={(e) => choose({ [key]: b }, e)}>
                      <title>{`${b} ${m.label.toLowerCase()}: ${binRange(key, b, cuts)} ${m.unit}, ${bin.n.toLocaleString()} counties`}</title>
                      <rect width={BIN_W} height={bin.h} rx={3} className={active ? 'bin-rect active' : 'bin-rect'} />
                      <text x={BIN_W / 2} y={18} textAnchor="middle" className={active ? 'bin-name active' : 'bin-name'}>{b}</text>
                      <text x={BIN_W / 2} y={34} textAnchor="middle" className="bin-count">
                        {showRanges ? binRange(key, b, cuts) : bin.n.toLocaleString()}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
        <div className="small text-secondary hover-line">
          {hover
            ? `${hover.a} ${METRIC[hover.ka].label.toLowerCase()} → ${hover.b} ${METRIC[hover.kb].label.toLowerCase()}: ${hover.n.toLocaleString()} counties${hasSel ? `, ${hover.s.toLocaleString()} in selection` : ''}. Click to select, shift-click to add.`
            : 'Click a ribbon or bin to highlight counties; shift-click adds a condition. Equal-frequency bins over complete records.'}
        </div>
        <hr />
        <div className="d-flex align-items-center gap-2 fw-semibold small sel-legend">
          <span className="sel-swatch" /> {selectionLabel(selection, order)}
          {hasSel && <span className="text-secondary fw-normal">· {selectedCount.toLocaleString()} counties</span>}
        </div>
        <div className="d-flex flex-wrap gap-3 small text-secondary mt-1">
          <span><span className="key-box complete" /> {counties.length.toLocaleString()} complete records{data.mock ? ' (mock)' : ''}</span>
          <span><span className="key-box incomplete" /> {incomplete.length} incomplete{data.mock ? ' (mock)' : ''}</span>
        </div>
        <div className="small text-secondary mt-1">Incomplete records are gray, excluded from ranking and never treated as zero.</div>
      </div>
    </div>
  )
}
