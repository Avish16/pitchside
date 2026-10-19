import { useEffect, useState } from 'react'
import { notesMarkdown, speakerLabel, type PitchsideBridge, type SummaryEvent } from '@pitchside/shared'

export function AfterCall({ bridge }: { bridge: PitchsideBridge }) {
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [provider, setProvider] = useState('')
  const [notice, setNotice] = useState('')
  const [includeTranscript, setIncludeTranscript] = useState(false)

  useEffect(() => {
    return bridge.onSummary((event: SummaryEvent) => {
      if (event.type === 'start') {
        setDraft('')
        setStatus('streaming')
        setProvider('')
        setNotice('')
      } else if (event.type === 'delta') {
        setDraft((current) => current + event.text)
      } else if (event.type === 'done') {
        setStatus('done')
        setProvider(event.provider)
      } else {
        setStatus('error')
        setNotice(event.message)
      }
    })
  }, [bridge])

  return (
    <section className="card">
      <h2>After the call</h2>
      <p className="fine">
        The transcript stays on this computer. Drafting the follow-up is the moment it is sent to the model. Audio is
        never included.
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={status === 'streaming'}
          onClick={() => {
            void bridge.summarize().then((result) => {
              if (!result.ok) setNotice(result.error)
            })
          }}
        >
          {status === 'streaming' ? 'Writing…' : 'Draft follow-up'}
        </button>
      </div>
      {provider ? <p className="fine">Drafted with {provider}.</p> : null}
      {draft ? <pre className="answer-body">{draft}</pre> : <p className="fine">No draft yet.</p>}
      {notice ? <p className="warn">{notice}</p> : null}
      <label className="check">
        <input
          type="checkbox"
          checked={includeTranscript}
          onChange={(event) => setIncludeTranscript(event.target.checked)}
        />
        Include the transcript in the export
      </label>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void (async () => {
              const lines = includeTranscript ? await bridge.getTranscript() : []
              const transcript = lines.map((line) => `${speakerLabel(line.speaker)}: ${line.text}`).join('\n')
              const markdown = notesMarkdown({ summary: draft, transcript: includeTranscript ? transcript : undefined })
              const result = await bridge.exportNotes(markdown)
              setNotice(result.ok ? `Saved ${result.path}` : result.error)
            })()
          }}
        >
          Export notes
        </button>
      </div>
    </section>
  )
}
