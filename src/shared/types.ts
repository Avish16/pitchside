export type Speaker = 'you' | 'them'

export type TriggerKind = 'question' | 'objection'

export const DEFAULT_MODEL = 'openai/gpt-4.1-mini'

export const MAX_CONTEXT_CHARS = 80_000

export const TARGET_SAMPLE_RATE = 16_000

export interface PromptTurn {
  speaker: Speaker
  text: string
}

export interface PublicSettings {
  model: string
  contextDoc: string
  hasDeepgramKey: boolean
  hasOpenrouterKey: boolean
  deepgramHint: string
  openrouterHint: string
  keyStorage: 'os-keychain' | 'local-file'
}

export interface SettingsUpdate {
  model: string
  contextDoc: string
  deepgramApiKey?: string
  openrouterApiKey?: string
  clearDeepgram?: boolean
  clearOpenrouter?: boolean
}

export interface AppState {
  settings: PublicSettings
  platform: NodeJS.Platform
  clickThrough: boolean
  hotkeys: {
    toggle: string
    clickThrough: string
  }
  opaque: boolean
}

export function speakerLabel(speaker: Speaker): string {
  return speaker === 'you' ? 'You' : 'Them'
}
