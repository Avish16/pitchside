import { describe, expect, it } from 'vitest'
import { deepgramListenUrl, deepgramProtocols, parseDeepgramMessage } from './deepgram'

describe('deepgram messages', () => {
  it('opens one multichannel listen socket', () => {
    const url = new URL(deepgramListenUrl())
    expect(url.pathname).toBe('/v1/listen')
    expect(url.searchParams.get('channels')).toBe('2')
    expect(url.searchParams.get('multichannel')).toBe('true')
    expect(url.searchParams.get('encoding')).toBe('linear16')
    expect(deepgramProtocols('jwt')).toEqual(['token', 'jwt'])
  })

  it('labels channel 0 as you and channel 1 as the client', () => {
    const you = parseDeepgramMessage(
      JSON.stringify({
        type: 'Results',
        channel_index: [0, 2],
        is_final: false,
        channel: { alternatives: [{ transcript: 'let me check' }] },
      }),
    )
    const client = parseDeepgramMessage(
      JSON.stringify({
        type: 'Results',
        channel_index: [1, 2],
        is_final: true,
        channel: { alternatives: [{ transcript: 'what does onboarding take?' }] },
      }),
    )
    expect(you).toEqual({ type: 'transcript', event: { type: 'partial', speaker: 'you', text: 'let me check' } })
    expect(client).toEqual({
      type: 'transcript',
      event: { type: 'final', speaker: 'client', text: 'what does onboarding take?' },
    })
  })

  it('ignores empty results and surfaces errors', () => {
    expect(parseDeepgramMessage('{"type":"Metadata"}')).toEqual({ type: 'ignore' })
    expect(parseDeepgramMessage('{"type":"Error","description":"bad auth"}')).toEqual({
      type: 'error',
      message: 'bad auth',
    })
  })
})
