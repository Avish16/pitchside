import { useEffect, useRef, useState } from 'react'
import type { AnswerMode, DesktopSettings, SharePreview, Snapshot } from '@pitchside/shared'
import { applyAnswerEvent, type AnswerCard } from '../answers'
import { AnswerView } from '../AnswerView'

const empty: Snapshot = {
  backend: 'unknown',
  overlayVisible: false,
  clickThrough: false,
  platform: 'linux',
  hotkeys: { toggle: 'Ctrl+Shift+Space', clickThrough: 'Ctrl+Shift+C', ask: 'Ctrl+Shift+A', deep: 'Ctrl+Shift+D' },
}

export function PanelApp() {
  const bridge = window.pitchside
  const [snapshot, setSnapshot] = useState<Snapshot>(empty)
  const [preview, setPreview] = useState<SharePreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [settings, setSettings] = useState<DesktopSettings>({ devToken: 'pitchside-dev', backendUrl: 'http://127.0.0.1:43124' })
  const [tokenDraft, setTokenDraft] = useState('pitchside-dev')
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState<AnswerCard[]>([])
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState('')
  const askRef = useRef<HTMLTextAreaElement>(null)
  const questionRef = useRef(question)
  questionRef.current = question

  useEffect(() => {
    if (!bridge) return
    void bridge.getSnapshot().then(setSnapshot)
    void bridge.getSettings().then((next) => {
      setSettings(next)
      setTokenDraft(next.devToken)
    })
    const offSnapshot = bridge.onSnapshot(setSnapshot)
    const offAsk = bridge.onAskFocus(() => askRef.current?.focus())
    const offDeep = bridge.onDeepAsk(() => {
      askRef.current?.focus()
      const text = questionRef.current.trim()
      if (text) void submit('deep', text)
    })
    const offAnswer = bridge.onAnswer((event) => {
      setCards((current) => applyAnswerEvent(current, event))
      if (event.type === 'done' || event.type === 'error') setAsking(false)
    })
    return () => {
      offSnapshot()
      offAsk()
      offDeep()
      offAnswer()
    }
  }, [bridge])

  async function submit(mode: AnswerMode, text = question): Promise<void> {
    if (!bridge) return
    const trimmed = text.trim()
    if (!trimmed) {
      setAskError('Type a question first.')
      askRef.current?.focus()
      return
    }
    setAskError('')
    setAsking(true)
    const result = await bridge.ask({ question: trimmed, mode })
    if (!result.ok) {
      setAsking(false)
      setAskError(result.error)
    }
  }

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
          <span className="nav-item active">Call</span>
        </nav>
      </aside>
      <main>
        <header>
          <div>
            <h1>Ask from the sideline</h1>
            <p>
              Type a question from the call. The backend streams a short answer into this panel and the overlay. Provider
              keys stay on the backend.
            </p>
          </div>
          <button type="button" className="ghost" onClick={() => void bridge.quit()}>
            Quit
          </button>
        </header>

        <section className="card">
          <h2>Question</h2>
          <label className="ask-label">
            What did they just ask?
            <textarea
              ref={askRef}
              rows={3}
              value={question}
              placeholder="What is the seat price if they start with ten people?"
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void submit('fast')
                }
              }}
            />
          </label>
          <div className="actions">
            <button type="button" className="primary" disabled={asking} onClick={() => void submit('fast')}>
              {asking ? 'Answering…' : 'Fast answer'}
            </button>
            <button type="button" className="ghost" disabled={asking} onClick={() => void submit('deep')}>
              Deep answer
            </button>
          </div>
          {askError ? <p className="warn">{askError}</p> : null}
          <p className="fine">
            {snapshot.hotkeys.ask} focuses this box. {snapshot.hotkeys.deep} sends the current question as a deep answer.
            Fast uses the live model. Deep uses the longer model configured on the backend.
          </p>
          {cards[0] ? <AnswerView card={cards[0]} /> : <p className="fine">No answer yet. The offline demo still streams a labeled reply.</p>}
        </section>

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
            toggles click-through. The app stays listed in Activity Monitor and Task Manager.
          </p>
          <label className="ask-label">
            Dev access token
            <input
              value={tokenDraft}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setTokenDraft(event.target.value)}
            />
          </label>
          <div className="actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                void bridge.saveSettings({ devToken: tokenDraft }).then((next) => {
                  setSettings(next)
                  setTokenDraft(next.devToken)
                })
              }}
            >
              Save token
            </button>
          </div>
          <p className="fine">
            This token only unlocks your local backend ({settings.backendUrl}). Anthropic, OpenRouter, and Deepgram keys
            belong in the backend .env, not here.
          </p>
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
