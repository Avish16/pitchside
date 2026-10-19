import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

export interface LocalSettings {
  devToken: string
}

export function readLocalSettings(filePath: string, fallback = 'pitchside-dev'): LocalSettings {
  if (!existsSync(filePath)) return { devToken: fallback }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { devToken?: unknown }
    const devToken = typeof parsed.devToken === 'string' && parsed.devToken.trim() ? parsed.devToken.trim() : fallback
    return { devToken }
  } catch {
    return { devToken: fallback }
  }
}

export function writeLocalSettings(filePath: string, settings: LocalSettings): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify({ devToken: settings.devToken.trim() || 'pitchside-dev' }, null, 2))
}
