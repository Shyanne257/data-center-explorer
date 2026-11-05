import { useEffect, useMemo, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { GeoJsonLayer, LineLayer, ScatterplotLayer } from '@deck.gl/layers'
import {
  ORANGE, MAX_ADDED, SITE_COLOR, ROUTE_COLOR,
  ramp, catchColor, densityColor, timeFor, fmt,
} from '../lib/encoding.js'

// MapLibre loads its tile worker from a separate file; point it at the copy Vite emits.
maplibregl.setWorkerUrl(maplibreWorkerUrl)

const BASEMAP = 'https://tiles.openfreemap.org/styles/positron'
const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef0f2' } }],
}

async function loadStyle() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(BASEMAP, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(res.status)
    return BASEMAP
  } catch {
    return FALLBACK_STYLE
  }
}

function buildLayers({ data, mode, threshold, layers, topPercent, site, origin }) {
  const { blockGroups, routes, siteList, sites, catchments, sortedFlows } = data
  const catchment = catchments[site]
  const T = threshold
  // exact pipeline flags at the 10-minute threshold, rounded minutes otherwise
  const inside = (g, m) => {
    const e = catchment[g]
    if (!e) return false
    return T === data.meta.threshold ? ((e[2] >> (m === 'off' ? 0 : 1)) & 1) === 1 : timeFor(e, m) <= T
  }
  const out = []

  out.push(new GeoJsonLayer({
    id: 'block-groups',
    data: blockGroups,
    pickable: true,
    stroked: true,
    filled: true,
    lineWidthUnits: 'pixels',
    getFillColor: (f) => {
      const p = f.properties
      const c = catchment[p.g]
      if (layers.catchment && mode === 'delta' && inside(p.g, 'off')) {
        return [...ramp(ORANGE, (c[1] - c[0]) / MAX_ADDED), 220]
      }
      if (layers.catchment && mode !== 'delta' && inside(p.g, mode)) {
        return [...catchColor(timeFor(c, mode), T), 215]
      }
      return layers.density ? [...densityColor(p.density), 200] : [0, 0, 0, 0]
    },
    getLineColor: (f) => {
      const p = f.properties
      if (p.g === origin) return [15, 23, 42, 255]
      // in added-minutes view, outline block groups that drop out of the catchment at peak
      if (layers.catchment && mode === 'delta' && inside(p.g, 'off') && !inside(p.g, 'peak')) return [120, 40, 0, 230]
      return layers.catchment && inside(p.g, mode === 'delta' ? 'off' : mode) ? [40, 80, 220, 140] : [255, 255, 255, 110]
    },
    getLineWidth: (f) => {
      const p = f.properties
      if (p.g === origin) return 2.5
      if (layers.catchment && mode === 'delta' && inside(p.g, 'off') && !inside(p.g, 'peak')) return 1.4
      return 0.5
    },
    updateTriggers: {
      getFillColor: [mode, T, site, layers.catchment, layers.density],
      getLineColor: [mode, T, site, origin, layers.catchment],
      getLineWidth: [mode, T, site, origin, layers.catchment],
    },
  }))

  if (layers.roads) {
    const key = mode === 'off' ? 'fo' : 'fp'
    const arr = sortedFlows[key]
    const cut = arr[Math.floor((arr.length * (100 - topPercent)) / 100)] ?? 0
    out.push(new GeoJsonLayer({
      id: 'road-flows',
      data: routes.features.filter((f) => f.properties[key] > 0 && f.properties[key] >= cut),
      pickable: true,
      stroked: true,
      filled: false,
      lineWidthUnits: 'pixels',
      // width ∝ √(residents routed to their nearest data center)
      getLineWidth: (f) => Math.max(0.8, Math.sqrt(f.properties[key]) / 45),
      getLineColor: [110, 140, 200, 170],
      updateTriggers: { getLineWidth: [mode] },
    }))
  }

  if (origin && blockGroups.byId?.[origin]) {
    const from = blockGroups.byId[origin].properties.c
    const to = sites[site].c
    out.push(new LineLayer({
      id: 'example-route',
      data: [{ from, to }],
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getColor: [...ROUTE_COLOR, 230],
      getWidth: 3,
      widthUnits: 'pixels',
    }))
    out.push(new ScatterplotLayer({
      id: 'example-origin',
      data: [{ c: from }],
      getPosition: (d) => d.c,
      getRadius: 6,
      radiusUnits: 'pixels',
      getFillColor: [...ROUTE_COLOR, 255],
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2,
    }))
  }

  if (layers.sites) {
    out.push(new ScatterplotLayer({
      id: 'sites',
      data: siteList,
      pickable: true,
      radiusUnits: 'pixels',
      stroked: true,
      getPosition: (d) => d.c,
      getRadius: (d) => (d.id === site ? 10 : 6),
      getFillColor: (d) => (d.id === site ? [255, 255, 255] : SITE_COLOR),
      getLineColor: (d) => (d.id === site ? SITE_COLOR : [255, 255, 255]),
      getLineWidth: (d) => (d.id === site ? 4 : 1.5),
      lineWidthUnits: 'pixels',
      updateTriggers: { getRadius: [site], getFillColor: [site], getLineColor: [site], getLineWidth: [site] },
    }))
  }
  return out
}

function tooltipFor(data, mode, site) {
  const style = { backgroundColor: '#fff', color: '#212529', fontSize: '12px', border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px 10px', maxWidth: '260px' }
  return ({ object, layer }) => {
    if (!object || !layer) return null
    if (layer.id === 'block-groups') {
      const p = object.properties
      const c = data.catchments[site][p.g]
      return {
        html: `<b>Block group ${p.g.slice(-7)}</b><br>${fmt(p.pop)} residents · ${p.inc} income<br>
          To ${data.sites[site].name}: ${c[0]} min off-peak, ${c[1]} min peak<br>
          <span style="color:#6c757d">Click to use as example origin</span>`,
        style,
      }
    }
    if (layer.id === 'sites') {
      return { html: `<b>${object.id} · ${object.name}</b><br>${object.op ? `${object.op}<br>` : ''}${object.n} mapped building${object.n > 1 ? 's' : ''}<br><span style="color:#6c757d">Click to make it the destination</span>`, style }
    }
    if (layer.id === 'road-flows') {
      const p = object.properties
      return { html: `<b>${p.n || `${p.h} road`}</b><br>Residents routed: ${fmt(p.fo)} off-peak, ${fmt(p.fp)} peak`, style }
    }
    return null
  }
}

export default function ReachabilityMap({ data, mode, threshold, layers, topPercent, site, origin, onSite, onOrigin }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const latestRef = useRef(null)
  const handlersRef = useRef({ onSite, onOrigin })

  const deckLayers = useMemo(
    () => buildLayers({ data, mode, threshold, layers, topPercent, site, origin }),
    [data, mode, threshold, layers, topPercent, site, origin],
  )
  const tooltip = useMemo(() => tooltipFor(data, mode, site), [data, mode, site])

  useEffect(() => {
    handlersRef.current = { onSite, onOrigin }
    latestRef.current = { layers: deckLayers, getTooltip: tooltip }
  })

  useEffect(() => {
    let disposed = false
    loadStyle().then((style) => {
      if (disposed) return
      const [w, s, e, n] = data.meta.bounds
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        bounds: [[w, s], [e, n]],
        fitBoundsOptions: { padding: 20 },
        attributionControl: { compact: true },
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
      const overlay = new MapboxOverlay({
        layers: [],
        onClick: (info) => {
          if (info?.layer?.id === 'sites') handlersRef.current.onSite(info.object.id)
          else if (info?.layer?.id === 'block-groups') handlersRef.current.onOrigin(info.object.properties.g)
        },
      })
      map.addControl(overlay)
      mapRef.current = map
      overlayRef.current = overlay
      overlay.setProps(latestRef.current)
    })
    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      overlayRef.current = null
    }
  }, [data])

  useEffect(() => {
    overlayRef.current?.setProps({ layers: deckLayers, getTooltip: tooltip })
  }, [deckLayers, tooltip])

  return <div ref={containerRef} className="map-canvas" />
}
