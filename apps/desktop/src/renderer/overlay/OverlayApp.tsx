import { useEffect, useState } from 'react'
import type { Snapshot } from '@pitchside/shared'

const empty: Snapshot = { backend: 'unknown', overlayVisible: true, platform: 'linux' }

export function OverlayApp() {
  const bridge = window.pitchside
  const [snapshot, setSnapshot] = useState<Snapshot>(empty)

  useEffect(() => {
    if (!bridge) return
    void bridge.getSnapshot().then(setSnapshot)
    return bridge.onSnapshot(setSnapshot)
  }, [bridge])

  return (
    <div className="overlay-shell">
      <section className="overlay-card">
        <header className="drag">
          <div>
            <div className="word title">Pitchside</div>
            <p>Sideline notes for the call you are on.</p>
          </div>
          <button type="button" className="ghost no-drag" onClick={() => void bridge?.hideOverlay()}>
            Hide
          </button>
        </header>
        <p className="lede">
          Talking points and the rolling transcript will sit here once a call is running. Open the control panel to
          connect the backend and start.
        </p>
        <div className="row">
          <span className={`pill ${snapshot.backend}`}>Backend {snapshot.backend}</span>
          <span className="pill">Overlay</span>
        </div>
        {!bridge ? <p className="warn">This window only works inside the Pitchside desktop app.</p> : null}
      </section>
    </div>
  )
}
