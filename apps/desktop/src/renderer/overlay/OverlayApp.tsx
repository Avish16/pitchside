import { useEffect, useState } from 'react'
import type { SlideHint, Snapshot, TranscriptLine, TriageNotice } from '@pitchside/shared'
import { applyAnswerEvent, type AnswerCard } from '../answers'
import { AnswerView } from '../AnswerView'
import { TranscriptList } from '../call/TranscriptList'
import { TriageBanner } from '../triage/TriageBanner'

const empty: Snapshot = {
  backend: 'unknown',
  overlayVisible: true,
  clickThrough: false,
  platform: 'linux',
  hotkeys: { toggle: 'Ctrl+Shift+Space', clickThrough: 'Ctrl+Shift+C', ask: 'Ctrl+Shift+A', deep: 'Ctrl+Shift+D' },
}

export function OverlayApp() {
  const bridge = window.pitchside
  const [snapshot, setSnapshot] = useState<Snapshot>(empty)
  const [card, setCard] = useState<AnswerCard | null>(null)
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [hint, setHint] = useState<SlideHint | null>(null)
  const [triage, setTriage] = useState<TriageNotice | null>(null)

  useEffect(() => {
    if (!bridge) return
    void bridge.getSnapshot().then(setSnapshot)
    void bridge.getTranscript().then(setLines)
    const offSnapshot = bridge.onSnapshot(setSnapshot)
    const offTranscript = bridge.onTranscript(setLines)
    const offHint = bridge.onDeckHint(setHint)
    const offTriage = bridge.onTriage(setTriage)
    const offAnswer = bridge.onAnswer((event) => {
      setCard((current) => {
        const next = applyAnswerEvent(current ? [current] : [], event)
        return next[0] ?? current
      })
    })
    return () => {
      offSnapshot()
      offTranscript()
      offHint()
      offTriage()
      offAnswer()
    }
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
        {snapshot.clickThrough ? (
          <p className="warn">Click-through is on. Press {snapshot.hotkeys.clickThrough} to use this panel again.</p>
        ) : null}
        <div className="answer-scroll">
          <TriageBanner notice={triage} />
          {hint ? (
            <p className="hint">
              Jump to slide {hint.number} — {hint.title}
            </p>
          ) : null}
          <TranscriptList lines={lines} limit={5} />
          {card ? (
            <AnswerView card={card} />
          ) : (
            <p className="lede">
              Answers land here as they stream. {snapshot.hotkeys.ask} opens the control panel so you can type a question
              without this overlay taking focus.
            </p>
          )}
        </div>
        <div className="row">
          <span className={`pill ${snapshot.backend}`}>Backend {snapshot.backend}</span>
          <span className="pill">Excluded from capture</span>
        </div>
        <p className="fine">
          {snapshot.hotkeys.toggle} show or hide · {snapshot.hotkeys.clickThrough} click-through · {snapshot.hotkeys.ask}{' '}
          ask · {snapshot.hotkeys.deep} deep answer
        </p>
        {!bridge ? <p className="warn">This window only works inside the Pitchside desktop app.</p> : null}
      </section>
    </div>
  )
}
