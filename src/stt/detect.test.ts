import { describe, expect, it } from 'vitest'
import { decideSuggestion, detectTrigger } from './detect'

describe('detectTrigger', () => {
  it('marks prospect questions', () => {
    expect(detectTrigger('How does your pricing work?')?.kind).toBe('question')
    expect(detectTrigger('Can you walk me through onboarding?')?.kind).toBe('question')
    expect(detectTrigger('So how does implementation usually go')?.kind).toBe('question')
  })

  it('marks common sales objections, including ones phrased as questions', () => {
    expect(detectTrigger("That's more expensive than we expected.")?.kind).toBe('objection')
    expect(detectTrigger('We already have a vendor for this.')?.matched).toBe('already have a solution')
    expect(detectTrigger("I'll need to think about it and talk to my manager.")?.kind).toBe('objection')
    expect(detectTrigger("Isn't this too expensive?")?.kind).toBe('objection')
    expect(detectTrigger('Can you send me a deck?')?.matched).toBe('send info later')
  })

  it('ignores statements, greetings, and fragments', () => {
    expect(detectTrigger('Sounds good, thanks for explaining that.')).toBeNull()
    expect(detectTrigger('We are a 40 person team in Austin.')).toBeNull()
    expect(detectTrigger('Okay.')).toBeNull()
    expect(detectTrigger('How are you?')).toBeNull()
    expect(detectTrigger('Really?')).toBeNull()
  })
})

describe('decideSuggestion', () => {
  it('only fires for a new utterance from the other person', () => {
    const utterance = 'What is included in the annual plan?'
    expect(
      decideSuggestion({ speaker: 'you', utterance, lastTrigger: '' }),
    ).toBeNull()
    expect(
      decideSuggestion({ speaker: 'them', utterance, lastTrigger: '' })?.kind,
    ).toBe('question')
    expect(
      decideSuggestion({ speaker: 'them', utterance, lastTrigger: utterance }),
    ).toBeNull()
  })
})
