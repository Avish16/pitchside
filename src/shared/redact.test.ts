import { describe, expect, it } from 'vitest'
import { redactSecrets } from './redact'

describe('redactSecrets', () => {
  it('replaces secrets that show up in provider errors', () => {
    const message = 'OpenRouter rejected sk-or-v1-example-key-value'
    expect(redactSecrets(message, ['sk-or-v1-example-key-value'])).toBe(
      'OpenRouter rejected ••••',
    )
  })

  it('ignores empty and very short values', () => {
    expect(redactSecrets('token ab', ['', 'ab'])).toBe('token ab')
  })
})
