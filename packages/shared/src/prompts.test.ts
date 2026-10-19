import { describe, expect, it } from 'vitest'
import { LIVE_SYSTEM_PROMPT, answerUserPrompt, notesMarkdown, SUMMARY_SYSTEM_PROMPT } from './prompts'

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

  it('builds a local export and keeps the transcript out unless asked', () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain('## Follow-up email')
    const notes = notesMarkdown({ summary: '## Summary\nThey asked about price.' })
    expect(notes).toContain('## Summary')
    expect(notes).not.toContain('## Transcript')
    expect(notesMarkdown({ summary: '## Summary\nHi', transcript: 'Client: Price?' })).toContain('## Transcript')
  })
})
