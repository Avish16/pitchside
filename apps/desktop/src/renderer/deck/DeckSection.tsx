import { useEffect, useState } from 'react'
import type { DeckSlideSummary, PitchsideBridge, SlideHint } from '@pitchside/shared'

export function DeckSection({ bridge }: { bridge: PitchsideBridge }) {
  const [slides, setSlides] = useState<DeckSlideSummary[]>([])
  const [hint, setHint] = useState<SlideHint | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void bridge.listDeck().then(setSlides)
    return bridge.onDeckHint(setHint)
  }, [bridge])

  return (
    <section className="card">
      <h2>Deck</h2>
      <p className="fine">
        Slide text is embedded on this computer. When someone mentions a slide, Pitchside suggests where to jump. That
        hint does not call a model.
      </p>
      {hint ? (
        <p className="hint">
          Jump to slide {hint.number} — {hint.title}
          <span className="fine">{hint.excerpt}</span>
        </p>
      ) : (
        <p className="fine">No slide hint yet.</p>
      )}
      {slides.length === 0 ? <p className="fine">Load a PDF deck to start.</p> : null}
      <ol className="sources">
        {slides.map((slide) => (
          <li key={slide.number}>
            <strong>
              Slide {slide.number}. {slide.title}
            </strong>
            <span>{slide.excerpt}</span>
          </li>
        ))}
      </ol>
      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void bridge
              .openDeck()
              .then((result) => {
                if (!result.ok) {
                  setNotice(result.error)
                  return
                }
                setSlides(result.slides)
                setHint(null)
                setNotice(`${result.slides.length} slides ready.`)
              })
              .finally(() => setBusy(false))
          }}
        >
          {busy ? 'Reading…' : 'Load PDF'}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            void bridge.clearDeck().then((next) => {
              setSlides(next)
              setHint(null)
              setNotice('')
            })
          }}
        >
          Clear deck
        </button>
      </div>
      {notice ? <p className="fine">{notice}</p> : null}
    </section>
  )
}
