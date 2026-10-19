import { describe, expect, it } from 'vitest'
import { prepareCall } from './call'

const base = { consentAccepted: true, backendUrl: 'http://backend', devToken: 'pitchside-dev' }

describe('prepareCall', () => {
  it('refuses to start before consent', async () => {
    const result = await prepareCall({ ...base, consentAccepted: false })
    expect(result).toEqual({ ok: false, error: 'Accept the recording reminder before listening.' })
  })

  it('returns one listen url and does not keep the provider key', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ accessToken: 'short-lived', expiresIn: 60 }), { status: 200 })) as typeof fetch
    const result = await prepareCall({ ...base, fetchImpl })
    expect(result.ok).toBe(true)
    if (result.ok && result.mode === 'deepgram') {
      expect(result.accessToken).toBe('short-lived')
      expect(result.listenUrl).toContain('multichannel=true')
      expect(JSON.stringify(result)).not.toContain('deepgramApiKey')
    }
  })

  it('falls back to a local practice meeting when Deepgram is not configured', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 503 })) as typeof fetch
    const result = await prepareCall({ ...base, fetchImpl })
    expect(result).toMatchObject({ ok: true, mode: 'local' })
  })
})
