import type { AnswerEvent, AnswerMode, Citation } from '@pitchside/shared'

export interface AnswerCard {
  id: string
  question: string
  mode: AnswerMode
  text: string
  provider: string
  status: 'streaming' | 'done' | 'error'
  error: string
  citations: Citation[]
}

export function applyAnswerEvent(cards: AnswerCard[], event: AnswerEvent): AnswerCard[] {
  if (event.type === 'start') {
    const started: AnswerCard = {
      id: event.id,
      question: event.question,
      mode: event.mode,
      text: '',
      provider: '',
      status: 'streaming',
      error: '',
      citations: event.citations ?? [],
    }
    return [started, ...cards].slice(0, 6)
  }
  return cards.map((card) => {
    if (card.id !== event.id) return card
    if (event.type === 'delta') return { ...card, text: card.text + event.text }
    if (event.type === 'done') return { ...card, status: 'done', provider: event.provider }
    return { ...card, status: 'error', error: event.message }
  })
}
