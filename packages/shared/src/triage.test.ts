import { describe, expect, it } from 'vitest'
import { matchBattlecard, parseTriageJson, resolveTriage, triageLocal } from './triage'

describe('triage', () => {
  it('uses local rules for a clear objection, question, and small talk', () => {
    expect(triageLocal('This is too expensive for our budget.').kind).toBe('objection')
    expect(triageLocal('What is the seat price?').kind).toBe('question')
    expect(triageLocal('Send the contract and we can start.').kind).toBe('buying_signal')
    expect(triageLocal('Thanks, talk soon.').kind).toBe('small_talk')
    expect(triageLocal('What is the seat price?').confidence).toBeGreaterThan(0.6)
  })

  it('marks a mixed line as ambiguous and accepts a Haiku answer only then', () => {
    const mixed = triageLocal('Is the price too expensive to move forward?')
    expect(mixed.confidence).toBeLessThan(0.62)
    expect(resolveTriage(mixed, null).source).toBe('local')
    expect(resolveTriage(mixed, { kind: 'objection', confidence: 0.8 }).source).toBe('model')
    expect(resolveTriage(triageLocal('What is the seat price?'), { kind: 'other', confidence: 0.9 }).source).toBe('local')
    expect(parseTriageJson('sure {"kind":"objection","confidence":0.8}')).toEqual({
      kind: 'objection',
      confidence: 0.8,
    })
  })

  it('surfaces a battlecard when a trigger is said', () => {
    const card = matchBattlecard(
      [{ title: 'Budget', text: 'Compare the seat price with the rewrite time.', triggers: ['too expensive', 'budget'] }],
      'This feels too expensive',
    )
    expect(card?.title).toBe('Budget')
    expect(matchBattlecard([{ title: 'Budget', text: 'Talk track', triggers: ['budget'] }], 'Nice weather')).toBeNull()
  })
})