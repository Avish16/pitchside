import { describe, expect, it } from 'vitest'
import { applyAnswerEvent } from './answers'

describe('applyAnswerEvent', () => {
  it('assembles a streamed card and keeps the newest six', () => {
    let cards = applyAnswerEvent([], { type: 'start', id: 'a', question: 'Price?', mode: 'fast' })
    cards = applyAnswerEvent(cards, { type: 'delta', id: 'a', text: '• $40' })
    cards = applyAnswerEvent(cards, { type: 'done', id: 'a', provider: 'offline' })
    expect(cards[0]).toMatchObject({ text: '• $40', status: 'done', provider: 'offline' })

    for (let index = 0; index < 8; index += 1) {
      cards = applyAnswerEvent(cards, { type: 'start', id: String(index), question: 'q', mode: 'deep' })
    }
    expect(cards).toHaveLength(6)
    expect(cards[0]?.id).toBe('7')
  })
})
