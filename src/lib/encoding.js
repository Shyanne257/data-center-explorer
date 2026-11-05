// Visual encoding for the Dallas reachability map.

// Catchment: three blue steps by drive time to the selected data center (thirds of the threshold).
export const CATCH = [[59, 102, 245], [128, 156, 250], [196, 211, 253]]
// Added minutes at peak: orange ramp, 0 to 7+ minutes.
export const ORANGE = [[254, 230, 206], [253, 190, 133], [253, 141, 60], [230, 85, 13], [166, 54, 3]]
// Outside the catchment: gray by population density.
export const GRAY = [[241, 242, 244], [222, 225, 229], [199, 203, 209], [170, 176, 184]]
export const SITE_COLOR = [240, 145, 40]
export const ROUTE_COLOR = [20, 30, 50]
export const MAX_ADDED = 7

export function ramp(stops, t) {
  const v = Math.max(0, Math.min(1, t || 0))
  const x = v * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f))
}

export const catchColor = (minutes, T) => CATCH[minutes <= T / 3 ? 0 : minutes <= (2 * T) / 3 ? 1 : 2]

// density in people per km2 -> gray step (log scale)
export function densityColor(density) {
  const d = Math.log10(Math.max(density, 1))
  return GRAY[d < 2.5 ? 0 : d < 3.2 ? 1 : d < 3.6 ? 2 : 3]
}

export const rgb = (c) => `rgb(${c.join(',')})`
export const cssGradient = (stops) =>
  `linear-gradient(90deg, ${stops.map((c, i) => `rgb(${c}) ${((i / (stops.length - 1)) * 100).toFixed(0)}%`).join(', ')})`

export const CONDITIONS = { off: 'Off-peak', peak: 'Estimated peak', delta: 'Added minutes' }
export const THRESHOLDS = [10, 20, 30]

// Catchment entry: [offPeakMinutes, peakMinutes, mask]. Peak and added-minutes views use peak time.
export const timeFor = (entry, mode) => (mode === 'off' ? entry[0] : entry[1])

export const fmt = (n) => Math.round(n).toLocaleString('en-US')
export const fmtK = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
