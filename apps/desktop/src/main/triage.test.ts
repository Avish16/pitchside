import { describe, expect, it } from 'vitest'
import { classifyUtterance } from './triage'

describe('classifyUtterance', () => {
  it('keeps a clear objection local and attaches the battlecard', async () => {
    let called = false
    const notice = await classifyUtterance({
      text: 'This is too expensive for our budget.',
      matchCard: () => ({ title: 'Budget', excerpt: 'Compare the seat price with the rewrite time.' }),
      fetchRemote: async () => {
        called = true
        return null
      },
    })
    expect(called).toBe(false)
    expect(notice.kind).toBe('objection')
    expect(notice.source).toBe('local')
    expect(notice.battlecard?.title).toBe('Budget')
  })

  it('asks the model only when the line is ambiguous', async () => {
    const notice = await classifyUtterance({
      text: 'Is the price too expensive to move forward?',
      matchCard: () => ({ title: 'Budget', excerpt: 'Hold the price.' }),
      fetchRemote: async () => ({ kind: 'objection', confidence: 0.81, source: 'model' }),
    })
    expect(notice.source).toBe('model')
    expect(notice.kind).toBe('objection')
    expect(notice.battlecard?.title).toBe('Budget')
  })
})
