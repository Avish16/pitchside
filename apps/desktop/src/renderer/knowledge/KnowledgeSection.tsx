import { useEffect, useState } from 'react'
import type { KnowledgeSource, PitchsideBridge } from '@pitchside/shared'

export function KnowledgeSection({ bridge }: { bridge: PitchsideBridge }) {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [cardTitle, setCardTitle] = useState('')
  const [triggers, setTriggers] = useState('')
  const [cardText, setCardText] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(): Promise<void> {
    setSources(await bridge.listKnowledge())
  }

  useEffect(() => {
    void refresh()
  }, [bridge])

  return (
    <section className="card">
      <h2>Knowledge</h2>
      <p className="fine">
        Notes, links, and battlecards are chunked and embedded on this computer. A client question retrieves the closest
        notes locally, then the answer cites those sources.
      </p>
      {sources.length === 0 ? <p className="fine">No notes yet. Add a pricing sheet or a battlecard to ground answers.</p> : null}
      <ul className="sources">
        {sources.map((source) => (
          <li key={source.id}>
            <strong>
              {source.title} <span className="pill">{source.kind}</span>
            </strong>
            <span>{source.excerpt}</span>
            <button type="button" className="ghost" onClick={() => void bridge.removeKnowledge(source.id).then(setSources)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <label className="ask-label">
        Note title
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Seat pricing" />
      </label>
      <label className="ask-label">
        Note
        <textarea
          rows={3}
          value={text}
          placeholder="A seat is $40 a month for the first ten people."
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            void bridge.addKnowledge({ title, text, kind: 'doc' }).then((result) => {
              if (!result.ok) {
                setNotice(result.error)
                return
              }
              setTitle('')
              setText('')
              setNotice('')
              void refresh()
            })
          }}
        >
          Save note
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void bridge
              .openKnowledgeFile()
              .then((result) => {
                setNotice(result.ok ? '' : result.error)
                if (result.ok) void refresh()
              })
              .finally(() => setBusy(false))
          }}
        >
          {busy ? 'Loading…' : 'Load a file'}
        </button>
      </div>
      <label className="ask-label">
        Page link
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/pricing" />
      </label>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void bridge.addKnowledgeUrl(url).then((result) => {
              if (!result.ok) {
                setNotice(result.error)
                return
              }
              setUrl('')
              setNotice('')
              void refresh()
            })
          }}
        >
          Load link
        </button>
      </div>
      <h2>Battlecard</h2>
      <label className="ask-label">
        Title
        <input value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} placeholder="Budget objection" />
      </label>
      <label className="ask-label">
        Triggers, separated by commas
        <input value={triggers} onChange={(event) => setTriggers(event.target.value)} placeholder="too expensive, budget" />
      </label>
      <label className="ask-label">
        What to say
        <textarea
          rows={3}
          value={cardText}
          placeholder="Compare the seat price with the hours their team spends rewriting notes after every call."
          onChange={(event) => setCardText(event.target.value)}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void bridge
              .addKnowledge({
                title: cardTitle,
                text: cardText,
                kind: 'battlecard',
                triggers: triggers.split(',').map((item) => item.trim()),
              })
              .then((result) => {
                if (!result.ok) {
                  setNotice(result.error)
                  return
                }
                setCardTitle('')
                setTriggers('')
                setCardText('')
                setNotice('')
                void refresh()
              })
          }}
        >
          Save battlecard
        </button>
      </div>
      {notice ? <p className="warn">{notice}</p> : null}
    </section>
  )
}
