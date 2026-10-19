import { describe, expect, it } from 'vitest'
import { buildMessages } from './prompts'

describe('buildMessages', () => {
  it('grounds the model in the call context and the latest objection', () => {
    const messages = buildMessages({
      contextDoc: 'Seat price is $40. Do not discount below $36.',
      transcript: [
        { speaker: 'you', text: 'Happy to walk through the plan.' },
        { speaker: 'them', text: 'This is more expensive than we expected.' },
      ],
      triggerKind: 'objection',
      triggerText: 'This is more expensive than we expected.',
    })

    expect(messages[0]?.content).toContain('Do not invent')
    expect(messages[1]?.content).toContain('Seat price is $40')
    expect(messages[1]?.content).toContain('You: Happy to walk through the plan.')
    expect(messages[1]?.content).toContain('Objection just raised')
    expect(messages[1]?.content).toContain('Acknowledge the concern')
  })

  it('tells the model when no context was provided', () => {
    const messages = buildMessages({
      contextDoc: '   ',
      transcript: [],
      triggerKind: 'question',
      triggerText: 'How long is onboarding?',
    })
    expect(messages[1]?.content).toContain('Do not invent product specifics')
    expect(messages[1]?.content).toContain('Question just raised')
  })
})
