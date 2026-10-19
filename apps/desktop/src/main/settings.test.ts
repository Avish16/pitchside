import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readLocalSettings, writeLocalSettings } from './settings'

describe('local settings', () => {
  it('stores the dev token and never a provider key field', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'pitchside-')), 'settings.json')
    expect(readLocalSettings(filePath).devToken).toBe('pitchside-dev')
    writeLocalSettings(filePath, { devToken: 'desk-token' })
    expect(readLocalSettings(filePath)).toEqual({ devToken: 'desk-token' })
    expect(readLocalSettings(filePath)).not.toHaveProperty('anthropicApiKey')
  })
})
