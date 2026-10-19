import { useEffect, useState } from 'react'
import type { Snapshot } from '@pitchside/shared'

const empty: Snapshot = { backend: 'unknown', overlayVisible: false, platform: 'linux' }

export function PanelApp() {
  const bridge = window.pitchside
  const [snapshot, setSnapshot] = useState<Snapshot>(empty)

  useEffect(() => {
    if (!bridge) return
    void bridge.getSnapshot().then(setSnapshot)
    return bridge.onSnapshot(setSnapshot)
  }, [bridge])

  if (!bridge) {
    return (
      <main className="panel-missing">
        <h1 className="word">Pitchside</h1>
        <p>Open this from the desktop app with pnpm dev.</p>
      </main>
    )
  }

  return (
    <div className="panel-shell">
      <aside>
        <div className="word brand">Pitchside</div>
        <p className="aside-copy">Control room</p>
        <nav>
          <span className="nav-item active">Status</span>
        </nav>
      </aside>
      <main>
        <header>
          <div>
            <h1>Ready when the call is</h1>
            <p>
              The overlay floats over the meeting. This panel is where you check that the backend is up. Use the tray
              icon if a window gets hidden.
            </p>
          </div>
          <button type="button" className="ghost" onClick={() => void bridge.quit()}>
            Quit
          </button>
        </header>
        <section className="card">
          <div className="row">
            <span className={`pill ${snapshot.backend}`}>Backend {snapshot.backend}</span>
            <span className="pill">Overlay {snapshot.overlayVisible ? 'visible' : 'hidden'}</span>
            <span className="pill">{snapshot.platform}</span>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={() => void bridge.refreshHealth().then(setSnapshot)}>
              Check backend
            </button>
            <button type="button" className="ghost" onClick={() => void bridge.showOverlay()}>
              Show overlay
            </button>
            <button type="button" className="ghost" onClick={() => void bridge.hideOverlay()}>
              Hide overlay
            </button>
          </div>
          <p className="fine">
            Provider keys are not stored in this app. The backend on port 43124 is the only place they will live.
          </p>
        </section>
      </main>
    </div>
  )
}
