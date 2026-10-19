import { describe, expect, it } from 'vitest'
import { createUtteranceTracker } from './utterance'

describe('createUtteranceTracker', () => {
  it('joins final segments until the speaker pauses', () => {
    const tracker = createUtteranceTracker()
    expect(tracker.pushFinal('How does', false)).toBeNull()
    expect(tracker.pushFinal('pricing work?', true)).toBe('How does pricing work?')
    expect(tracker.flush()).toBeNull()
  })

  it('flushes a trailing fragment on utterance end', () => {
    const tracker = createUtteranceTracker()
    tracker.pushFinal('We have no budget this year.', false)
    expect(tracker.flush()).toBe('We have no budget this year.')
  })
})
