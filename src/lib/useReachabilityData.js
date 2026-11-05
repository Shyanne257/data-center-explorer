import { useEffect, useState } from 'react'
import { geoArea } from 'd3-geo'

// Loads the precomputed reachability files from public/data/ (see DATA_FORMAT.md).
const FILES = {
  blockGroups: 'blockgroups.geojson',
  routes: 'routes.geojson',
  sites: 'sites.json',
  catchments: 'catchments.json',
  meta: 'summary.json',
}
const EARTH_KM2 = 6371.0088 ** 2

export function useReachabilityData() {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    const base = `${import.meta.env.BASE_URL}data/`
    Promise.all(
      Object.entries(FILES).map(([key, file]) =>
        fetch(base + file).then((res) => {
          if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
          return res.json().then((json) => [key, json])
        }),
      ),
    )
      .then((entries) => {
        if (cancelled) return
        const data = Object.fromEntries(entries)
        data.siteList = Object.entries(data.sites).map(([id, s]) => ({ id, ...s }))
        // population density for the gray background (people per km2)
        for (const f of data.blockGroups.features) {
          // d3-geo expects clockwise rings; fall back to the complement if the ring is reversed
          let a = geoArea(f)
          if (a > 2 * Math.PI) a = 4 * Math.PI - a
          f.properties.density = f.properties.pop / Math.max(a * EARTH_KM2, 0.01)
        }
        data.blockGroups.byId = Object.fromEntries(data.blockGroups.features.map((f) => [f.properties.g, f]))
        data.sortedFlows = {}
        for (const key of ['fo', 'fp']) {
          data.sortedFlows[key] = data.routes.features.map((f) => f.properties[key]).filter((v) => v > 0).sort((a, b) => a - b)
        }
        setState({ data, error: null })
      })
      .catch((error) => !cancelled && setState({ data: null, error }))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
