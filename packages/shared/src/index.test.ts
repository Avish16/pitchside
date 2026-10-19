import { describe, expect, it } from 'vitest'
import { parseHealth } from './index'

describe('parseHealth', () => {
  it('accepts the backend health payload', () => {
    expect(parseHealth({ ok: true, service: 'pitchside' })).toEqual({
      ok: true,
      service: 'pitchside',
    })
  })

  it('rejects anything else', () => {
    expect(parseHealth({ ok: true, service: 'other' })).toBeNull()
    expect(parseHealth(null)).toBeNull()
    expect(parseHealth({ ok: false, service: 'pitchside' })).toBeNull()
  })
})
