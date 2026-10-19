import { describe, expect, it } from 'vitest'
import { deepgramListenUrl, parseDeepgramMessage } from './deepgram-parse'

describe('deepgramListenUrl', () => {
  it('asks Deepgram for 16-bit mono audio with endpointing', () => {
    const url = new URL(deepgramListenUrl(16000))
    expect(url.origin + url.pathname).toBe('https://api.deepgram.com/v1/listen'.replace('https', 'wss'))
    expect(url.searchParams.get('model')).toBe('nova-3')
    expect(url.searchParams.get('encoding')).toBe('linear16')
    expect(url.searchParams.get('sample_rate')).toBe('16000')
    expect(url.searchParams.get('interim_results')).toBe('true')
  })
})

describe('parseDeepgramMessage', () => {
  it('reads interim and final transcripts', () => {
    expect(
      parseDeepgramMessage(
        JSON.stringify({
          type: 'Results',
          is_final: false,
          speech_final: false,
          channel: { alternatives: [{ transcript: 'how much' }] },
        }),
      ),
    ).toEqual({
      kind: 'transcript',
      text: 'how much',
      isFinal: false,
      speechFinal: false,
    })
  })

  it('reads utterance end and errors', () => {
    expect(parseDeepgramMessage(JSON.stringify({ type: 'UtteranceEnd' }))).toEqual({
      kind: 'utterance_end',
    })
    expect(
      parseDeepgramMessage(JSON.stringify({ type: 'Error', description: 'Invalid credentials' })),
    ).toEqual({ kind: 'error', message: 'Invalid credentials' })
  })

  it('ignores metadata and malformed payloads', () => {
    expect(parseDeepgramMessage(JSON.stringify({ type: 'Metadata' })).kind).toBe('ignore')
    expect(parseDeepgramMessage('not-json').kind).toBe('ignore')
    expect(
      parseDeepgramMessage(
        JSON.stringify({
          type: 'Results',
          is_final: true,
          channel: { alternatives: [{ transcript: '   ' }] },
        }),
      ).kind,
    ).toBe('ignore')
  })
})
