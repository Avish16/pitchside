import { useEffect, useRef, useState } from 'react'
import { reduceTranscript, type PitchsideBridge, type TranscriptEvent, type TranscriptLine } from '@pitchside/shared'
import { startLiveCall, type CaptureStatus } from './live-call'
import { TranscriptList } from './TranscriptList'

const idleCapture: CaptureStatus = {
  mic: 'Not capturing',
  system: 'Not capturing',
  socket: 'Not connected',
}

export function CallSection({
  bridge,
  onClientFinal,
}: {
  bridge: PitchsideBridge
  onClientFinal?: (text: string) => void
}) {
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [practice, setPractice] = useState('')
  const [notice, setNotice] = useState('')
  const [capture, setCapture] = useState<CaptureStatus>(idleCapture)
  const linesRef = useRef<TranscriptLine[]>([])
  const stopRef = useRef<(() => void) | null>(null)
  const onFinalRef = useRef(onClientFinal)
  onFinalRef.current = onClientFinal

  useEffect(() => {
    void bridge.getSettings().then((settings) => setConsentAccepted(settings.consentAccepted))
    void bridge.getTranscript().then((existing) => {
      linesRef.current = existing
      setLines(existing)
    })
  }, [bridge])

  useEffect(() => () => stopRef.current?.(), [])

  function push(event: TranscriptEvent): void {
    const next = reduceTranscript(linesRef.current, event, () => crypto.randomUUID()).slice(-400)
    linesRef.current = next
    setLines(next)
    void bridge.publishTranscript(next)
    if (event.type === 'final' && event.speaker === 'client' && event.text.trim()) {
      onFinalRef.current?.(event.text.trim())
    }
  }

  async function start(): Promise<void> {
    const settings = await bridge.getSettings()
    setConsentAccepted(settings.consentAccepted)
    if (!settings.consentAccepted) {
      setConsentOpen(true)
      return
    }
    setBusy(true)
    setNotice('')
    const prepared = await bridge.prepareCall()
    if (!prepared.ok) {
      setBusy(false)
      setNotice(prepared.error)
      setConsentOpen(true)
      return
    }
    if (prepared.mode === 'local') {
      setRunning(true)
      setBusy(false)
      setNotice(prepared.reason)
      setCapture({ mic: 'Not capturing', system: 'Not capturing', socket: 'Local practice' })
      return
    }
    try {
      const live = await startLiveCall({
        accessToken: prepared.accessToken,
        listenUrl: prepared.listenUrl,
        onEvent: push,
        onStatus: setCapture,
      })
      stopRef.current = live.stop
      setRunning(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The microphone could not start.'
      setNotice(`${message} You can still practice a client line.`)
      setRunning(true)
      setCapture({ mic: 'Unavailable', system: 'Unavailable', socket: 'Local practice' })
    } finally {
      setBusy(false)
    }
  }

  function stop(): void {
    stopRef.current?.()
    stopRef.current = null
    setRunning(false)
    setCapture(idleCapture)
  }

  return (
    <section className="card">
      <h2>This call</h2>
      <p className="fine">
        Audio and the transcript stay on this computer unless you export them later. On a Mac, system audio is captured
        separately from the microphone. Tell the other person you are taking notes.
      </p>
      {consentAccepted ? <p className="fine">Recording reminder: nothing is uploaded until you ask for an answer.</p> : null}
      <div className="actions">
        {running ? (
          <button type="button" className="ghost" onClick={stop}>
            Stop listening
          </button>
        ) : (
          <button type="button" className="primary" disabled={busy} onClick={() => void start()}>
            {busy ? 'Starting…' : 'Start listening'}
          </button>
        )}
      </div>
      <div className="row">
        <span className="pill">{capture.mic}</span>
        <span className="pill">{capture.system}</span>
        <span className="pill">{capture.socket}</span>
      </div>
      {notice ? <p className="warn">{notice}</p> : null}
      <TranscriptList lines={lines} />
      <label className="ask-label">
        Practice a client line
        <textarea
          rows={2}
          value={practice}
          placeholder="What happens if we need to roll this out to the London team?"
          onChange={(event) => setPractice(event.target.value)}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const text = practice.trim()
            if (!text) return
            push({ type: 'final', speaker: 'client', text })
            setPractice('')
          }}
        >
          Add client line
        </button>
      </div>
      <p className="fine">
        Practice uses the same transcript path as a real client channel, without a microphone or a model call.
      </p>
      {consentOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <h2 id="consent-title">Before the first recording</h2>
            <p>
              Pitchside can capture your microphone and the other side of the call on this computer. The audio and the
              transcript stay here. They are not sent anywhere unless you later ask for an answer or export notes.
            </p>
            <p>People on the call should know you are capturing it for your own notes.</p>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  void bridge.acceptConsent().then((settings) => {
                    setConsentAccepted(settings.consentAccepted)
                    setConsentOpen(false)
                    void start()
                  })
                }}
              >
                I understand, start listening
              </button>
              <button type="button" className="ghost" onClick={() => setConsentOpen(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
