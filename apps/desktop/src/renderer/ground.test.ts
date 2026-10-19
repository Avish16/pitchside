import { describe, expect, it } from 'vitest'
import type { PitchsideBridge } from '@pitchside/shared'
import { askGrounded } from './ground'

describe('askGrounded', () => {
  it('sends retrieved notes and keeps the citation list local to the card', async () => {
    let sent: unknown
    const bridge = {
      searchKnowledge: async () => [
        { sourceId: 'price', title: 'Seat pricing', kind: 'doc' as const, excerpt: 'A seat is $40.', score: 0.4 },
      ],
      knowledgeContext: async () => '# Seat pricing (doc)\nA seat is $40.',
      getTranscript: async () => [{ id: '1', speaker: 'client' as const, text: 'What is the price?', final: true }],
      ask: async (input: unknown) => {
        sent = input
        return { ok: true as const, id: 'a' }
      },
    }
    await askGrounded(bridge as unknown as PitchsideBridge, 'What is the price?', 'fast')
    expect(sent).toMatchObject({
      context: '# Seat pricing (doc)\nA seat is $40.',
      notes: '[Seat pricing] A seat is $40.',
      transcript: 'Client: What is the price?',
      citations: [{ title: 'Seat pricing', excerpt: 'A seat is $40.' }],
    })
  })
})
