import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readLocalSettings, updateLocalSettings, writeLocalSettings } from './settings'

describe('local settings', () => {
  it('stores the dev token and consent, never a provider key', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'pitchside-')), 'settings.json')
    expect(readLocalSettings(filePath)).toEqual({ devToken: 'pitchside-dev', consentAccepted: false })
    writeLocalSettings(filePath, { devToken: 'desk-token', consentAccepted: false })
    const accepted = updateLocalSettings(filePath, { consentAccepted: true })
    expect(accepted).toEqual({ devToken: 'desk-token', consentAccepted: true })
    expect(updateLocalSettings(filePath, { devToken: 'next' }).consentAccepted).toBe(true)
    expect(readLocalSettings(filePath)).not.toHaveProperty('anthropicApiKey')
    expect(readLocalSettings(filePath)).not.toHaveProperty('deepgramApiKey')
  })
})
