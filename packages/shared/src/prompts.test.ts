import { describe, expect, it } from 'vitest'
import { LIVE_SYSTEM_PROMPT, answerUserPrompt } from './prompts'

describe('answer prompts', () => {
  it('forbids invented facts and includes the question', () => {
    expect(LIVE_SYSTEM_PROMPT).toContain('Do not invent')
    const prompt = answerUserPrompt({
      question: 'What is the seat price?',
      transcript: 'Client: Is it expensive?',
      notes: '[Seat pricing] $40',
    })
    expect(prompt).toContain('What is the seat price?')
    expect(prompt).toContain('$40')
  })
})
