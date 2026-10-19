import type { TriggerKind } from '../../../shared/types'

export interface SuggestionCard {
  id: string
  kind: TriggerKind
  triggerText: string
  content: string
  status: 'streaming' | 'done' | 'error'
  error?: string
}

interface SuggestionsPaneProps {
  cards: SuggestionCard[]
  live: boolean
}

export function SuggestionsPane({ cards, live }: SuggestionsPaneProps) {
  return (
    <section className="pane suggestions" aria-label="Suggestions">
      <div className="pane-head">
        <span>Talking points</span>
      </div>
      <div className="scroller" aria-live="polite">
        {cards.length === 0 ? (
          <p className="empty">
            {live
              ? 'Listening for a question or an objection from the other person.'
              : 'Start listening, then join the call. Short talking points show up when the other person asks something or pushes back.'}
          </p>
        ) : null}
        {cards.map((card) => (
          <article className={`card ${card.kind}`} key={card.id}>
            <header>
              <span>{card.kind === 'objection' ? 'Objection' : 'Question'}</span>
              <span>{card.status === 'streaming' ? 'Streaming' : card.status === 'error' ? 'Error' : 'Ready'}</span>
            </header>
            <blockquote>“{card.triggerText}”</blockquote>
            {card.status === 'error' ? <p className="thinking">{card.error}</p> : null}
            {card.status !== 'error' ? (
              <pre>
                {card.content || (card.status === 'streaming' ? 'Thinking…' : '')}
                {card.status === 'streaming' && card.content ? <span className="caret" aria-hidden="true" /> : null}
              </pre>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
