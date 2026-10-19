import { useEffect, useRef, useState } from 'react'
import type { SharePreview, Snapshot } from '@pitchside/shared'

const empty: Snapshot = {
  backend: 'unknown',
  overlayVisible: false,
  clickThrough: false,
  platform: 'linux',
  hotkeys: { toggle: 'Ctrl+Shift+Space', clickThrough: 'Ctrl+Shift+C', ask: 'Ctrl+Shift+A' },
}

export function PanelApp() {
  const bridge = window.pitchside
  const [snapshot, setSnapshot] = useState<Snapshot>(empty)
  const [preview, setPreview] = useState<SharePreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const askRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!bridge) return
    void bridge.getSnapshot().then(setSnapshot)
    const offSnapshot = bridge.onSnapshot(setSnapshot)
    const offAsk = bridge.onAskFocus(() => askRef.current?.focus())
    return () => {
      offSnapshot()
      offAsk()
    }
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
            <span className="pill">Click-through {snapshot.clickThrough ? 'on' : 'off'}</span>
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
            {snapshot.hotkeys.toggle} shows or hides the overlay without stealing focus. {snapshot.hotkeys.clickThrough}{' '}
            toggles click-through. {snapshot.hotkeys.ask} opens this panel. The app stays listed in Activity Monitor
            and Task Manager.
          </p>
          <label className="ask-label">
            Question
            <input ref={askRef} placeholder="The answer box connects once the model route is up." readOnly />
          </label>
        </section>
        <section className="card">
          <h2>Test my share</h2>
          <p className="fine">
            Grabs a thumbnail of the full display. If capture exclusion is working, the overlay is not in the image.
            Confirm with Zoom or OBS on Windows or macOS before a real call.
          </p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={previewing}
              onClick={() => {
                setPreviewing(true)
                void bridge
                  .testShare()
                  .then(setPreview)
                  .finally(() => setPreviewing(false))
              }}
            >
              {previewing ? 'Capturing…' : 'Test my share'}
            </button>
            <button type="button" className="ghost" onClick={() => void bridge.toggleClickThrough()}>
              {snapshot.clickThrough ? 'Click-through on' : 'Click-through'}
            </button>
          </div>
          {preview ? <p className="fine">{preview.note}</p> : null}
          {preview?.image ? <img className="share-preview" alt="Full display capture preview" src={preview.image} /> : null}
        </section>
      </main>
    </div>
  )
}
