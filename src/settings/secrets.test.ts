import { describe, expect, it } from 'vitest'
import { keyHint, keyStorageKind, openSecret, sealSecret } from './secrets'

const encrypt = (value: string): Buffer => Buffer.from(`sealed:${value}`, 'utf8')
const decrypt = (buffer: Buffer): string => {
  const text = buffer.toString('utf8')
  if (!text.startsWith('sealed:')) throw new Error('bad seal')
  return text.slice('sealed:'.length)
}

describe('secret storage helpers', () => {
  it('round-trips secrets through the OS keychain path and the local fallback', () => {
    expect(openSecret(sealSecret('dg_live_123', true, encrypt), decrypt)).toBe('dg_live_123')
    expect(openSecret(sealSecret('sk-or-abc', false, encrypt), decrypt)).toBe('sk-or-abc')
  })

  it('returns an empty string when decryption fails', () => {
    expect(openSecret('enc:bm90LWVuY3J5cHRlZA==', decrypt)).toBe('')
    expect(openSecret('', decrypt)).toBe('')
  })

  it('describes where the key lives and how to recognize it', () => {
    expect(keyStorageKind(true)).toBe('os-keychain')
    expect(keyStorageKind(false)).toBe('local-file')
    expect(keyHint('sk-or-secret-9f3a')).toBe('••••9f3a')
    expect(keyHint('')).toBe('')
  })
})
