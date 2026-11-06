import { useEffect, useState } from 'react'
import { prepareProfiles, DEFAULT_WEIGHTS, DEFAULT_ORDER, DEFAULT_SELECTION } from '../../lib/profiles.js'
import PrioritiesBar from './PrioritiesBar.jsx'
import ParallelSets from './ParallelSets.jsx'
import SelectedCounties from './SelectedCounties.jsx'

// Primary challenge: read resource combinations across U.S. counties.
export default function ResourceProfiles() {
  const [state, setState] = useState({ data: null, topo: null, error: null })
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [order, setOrder] = useState(DEFAULT_ORDER)
  const [selection, setSelection] = useState(DEFAULT_SELECTION)

  useEffect(() => {
    const base = `${import.meta.env.BASE_URL}data/`
    Promise.all([
      fetch(`${base}county_profiles.json`).then((r) => r.json()),
      fetch(`${base}counties-10m.json`).then((r) => r.json()),
    ])
      .then(([raw, topo]) => setState({ data: prepareProfiles(raw), topo, error: null }))
      .catch((error) => setState({ data: null, topo: null, error }))
  }, [])

  if (state.error) return <div className="alert alert-danger">Could not load county profiles: {String(state.error.message || state.error)}</div>
  if (!state.data) return <div className="text-center py-5"><div className="spinner-border text-secondary" role="status" /></div>

  return (
    <>
      <PrioritiesBar weights={weights} onApply={setWeights} />
      <div className="row g-4">
        <div className="col-xl-8">
          <ParallelSets data={state.data} order={order} setOrder={setOrder} selection={selection} onSelect={setSelection} />
        </div>
        <div className="col-xl-4">
          <SelectedCounties data={state.data} topo={state.topo} order={order} selection={selection} weights={weights} onClear={() => setSelection({})} />
        </div>
      </div>
    </>
  )
}
