import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from './links'

describe('isAllowedExternalUrl', () => {
  it('allows the provider consoles over https', () => {
    expect(isAllowedExternalUrl('https://console.deepgram.com/')).toBe(true)
    expect(isAllowedExternalUrl('https://openrouter.ai/models')).toBe(true)
  })

  it('rejects other hosts and schemes', () => {
    expect(isAllowedExternalUrl('http://openrouter.ai')).toBe(false)
    expect(isAllowedExternalUrl('https://example.com')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
