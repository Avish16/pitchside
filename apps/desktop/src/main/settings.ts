import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

export interface LocalSettings {
  devToken: string
  consentAccepted: boolean
}

export function readLocalSettings(filePath: string, fallback = 'pitchside-dev'): LocalSettings {
  const empty: LocalSettings = { devToken: fallback, consentAccepted: false }
  if (!existsSync(filePath)) return empty
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { devToken?: unknown; consentAccepted?: unknown }
    const devToken = typeof parsed.devToken === 'string' && parsed.devToken.trim() ? parsed.devToken.trim() : fallback
    return { devToken, consentAccepted: parsed.consentAccepted === true }
  } catch {
    return empty
  }
}

export function writeLocalSettings(filePath: string, settings: LocalSettings): LocalSettings {
  const next: LocalSettings = {
    devToken: settings.devToken.trim() || 'pitchside-dev',
    consentAccepted: settings.consentAccepted === true,
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(next, null, 2))
  return next
}

export function updateLocalSettings(filePath: string, patch: Partial<LocalSettings>): LocalSettings {
  const current = readLocalSettings(filePath)
  return writeLocalSettings(filePath, {
    devToken: patch.devToken ?? current.devToken,
    consentAccepted: patch.consentAccepted ?? current.consentAccepted,
  })
}
