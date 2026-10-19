import type { AnswerCard } from './answers'

export function AnswerView({ card }: { card: AnswerCard }) {
  const label = card.mode === 'deep' ? 'Deep answer' : 'Live answer'
  return (
    <article className="answer-card">
      <div className="row">
        <span className="pill">{label}</span>
        {card.status === 'streaming' ? <span className="pill">Streaming</span> : null}
        {card.status === 'done' ? <span className="pill">{card.provider}</span> : null}
        {card.status === 'error' ? <span className="pill down">Failed</span> : null}
      </div>
      <p className="answer-question">{card.question}</p>
      {card.text ? <pre className="answer-body">{card.text}</pre> : <p className="fine">Waiting for the first line…</p>}
      {card.citations.length > 0 ? (
        <ul className="sources">
          {card.citations.map((citation) => (
            <li key={`${citation.title}:${citation.excerpt}`}>
              <strong>{citation.title}</strong>
              <span>{citation.excerpt}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {card.error ? <p className="warn">{card.error}</p> : null}
    </article>
  )
}
