import { useEffect, useRef } from 'react'
import { speakerLabel, type Speaker } from '../../../shared/types'

export interface TranscriptLine {
  id: string
  speaker: Speaker
  text: string
}

interface TranscriptPaneProps {
  lines: TranscriptLine[]
  interims: Partial<Record<Speaker, string>>
  live: boolean
  onClear: () => void
}

export function TranscriptPane({ lines, interims, live, onClear }: TranscriptPaneProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const interimEntries = (Object.entries(interims) as Array<[Speaker, string]>).filter(([, text]) => text)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
    if (nearBottom) scroller.scrollTop = scroller.scrollHeight
  }, [lines, interims])

  return (
    <section className="pane transcript" aria-label="Transcript">
      <div className="pane-head">
        <span>Transcript</span>
        <button type="button" className="linkish" onClick={onClear} disabled={lines.length === 0}>
          Clear
        </button>
      </div>
      <div className="scroller" ref={scrollerRef} role="log" aria-relevant="additions">
        {lines.length === 0 && interimEntries.length === 0 ? (
          <p className="empty">
            {live ? 'Waiting for speech…' : 'The rolling transcript will appear here.'}
          </p>
        ) : null}
        {lines.map((line) => (
          <article className="line" key={line.id}>
            <span className={`who ${line.speaker}`}>{speakerLabel(line.speaker)}</span>
            <p>{line.text}</p>
          </article>
        ))}
        {interimEntries.map(([speaker, text]) => (
          <article className="line interim" key={`interim-${speaker}`}>
            <span className={`who ${speaker}`}>{speakerLabel(speaker)}</span>
            <p>
              {text}
              <span className="caret" aria-hidden="true" />
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
