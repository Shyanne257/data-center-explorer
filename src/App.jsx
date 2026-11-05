import ResourceProfiles from './components/primary/ResourceProfiles.jsx'
import ReachabilityView from './components/ReachabilityView.jsx'

export default function App() {
  return (
    <>
      <header className="app-header border-bottom bg-white">
        <div className="container-xxl d-flex align-items-center gap-3 py-3">
          <span className="logo">dc</span>
          <span className="h4 fw-bold mb-0">Data Center Explorer</span>
          <span className="text-secondary small d-none d-md-inline">Resources &amp; reachability</span>
          <nav className="ms-auto d-flex gap-3 small">
            <a href="#profiles" className="link-secondary text-decoration-none">Resource profiles</a>
            <a href="#reachability" className="link-secondary text-decoration-none">Dallas reachability</a>
            <span className="text-body d-none d-lg-inline">DSCI 554 / Team 15</span>
          </nav>
        </div>
      </header>

      <main className="container-xxl py-4">
        <section id="profiles" className="mb-5">
          <div className="eyebrow">01 Resource profiles</div>
          <h1 className="h2 fw-bold mb-3">Resource profiles</h1>
          <ResourceProfiles />
        </section>

        <section id="reachability" className="mb-4">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
            <div>
              <div className="eyebrow">02 Dallas reachability</div>
              <h2 className="h2 fw-bold mb-0">Dallas reachability</h2>
              <div className="text-secondary mb-3">Driving · block-group origins → mapped data centers · travel time in minutes</div>
            </div>
            <span className="badge rounded-pill text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">Peak times are modeled estimates</span>
          </div>
          <ReachabilityView />
        </section>

        <div className="mock-banner small px-3 py-2">
          <b>MOCK DATA</b> in Resource profiles: county values are placeholders until the team's county table is connected.
          Dallas reachability uses computed drive times (OpenStreetMap, Census ACS 2019–2023).
        </div>
      </main>

      <footer className="container-xxl d-flex justify-content-between small py-3 border-top">
        <span className="fw-semibold">Data Center Explorer</span>
        <span className="text-secondary">DSCI 554 · Team 15</span>
      </footer>
    </>
  )
}
