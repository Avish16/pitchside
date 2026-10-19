import { safeStorage } from 'electron'
import Store from 'electron-store'
import { DEFAULT_MODEL, MAX_CONTEXT_CHARS, type PublicSettings, type SettingsUpdate } from '../shared/types'
import { keyHint, keyStorageKind, openSecret, sealSecret } from './secrets'

interface Schema {
  model: string
  contextDoc: string
  deepgramEnc: string
  openrouterEnc: string
}

export interface SecretSettings {
  deepgramApiKey: string
  openrouterApiKey: string
  model: string
  contextDoc: string
}

let store: Store<Schema> | null = null
let seeded = false

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function seal(plain: string): string {
  return sealSecret(plain, encryptionAvailable(), (value) => safeStorage.encryptString(value))
}

function open(stored: string): string {
  return openSecret(stored, (buffer) => safeStorage.decryptString(buffer))
}

function getStore(): Store<Schema> {
  if (!store) {
    store = new Store<Schema>({
      name: 'call-copilot',
      defaults: {
        model: DEFAULT_MODEL,
        contextDoc: '',
        deepgramEnc: '',
        openrouterEnc: '',
      },
    })
  }
  if (!seeded) {
    seeded = true
    const deepgram = process.env.DEEPGRAM_API_KEY?.trim() ?? ''
    const openrouter = process.env.OPENROUTER_API_KEY?.trim() ?? ''
    const model = process.env.OPENROUTER_MODEL?.trim() ?? ''
    if (deepgram && !store.get('deepgramEnc')) store.set('deepgramEnc', seal(deepgram))
    if (openrouter && !store.get('openrouterEnc')) store.set('openrouterEnc', seal(openrouter))
    if (model && store.get('model') === DEFAULT_MODEL) store.set('model', model)
  }
  return store
}

export function getPublicSettings(): PublicSettings {
  const current = getStore()
  const deepgram = open(current.get('deepgramEnc'))
  const openrouter = open(current.get('openrouterEnc'))
  return {
    model: current.get('model') || DEFAULT_MODEL,
    contextDoc: current.get('contextDoc') || '',
    hasDeepgramKey: Boolean(deepgram),
    hasOpenrouterKey: Boolean(openrouter),
    deepgramHint: keyHint(deepgram),
    openrouterHint: keyHint(openrouter),
    keyStorage: keyStorageKind(encryptionAvailable()),
  }
}

export function getSecretSettings(): SecretSettings {
  const current = getStore()
  return {
    deepgramApiKey: open(current.get('deepgramEnc')),
    openrouterApiKey: open(current.get('openrouterEnc')),
    model: current.get('model') || DEFAULT_MODEL,
    contextDoc: current.get('contextDoc') || '',
  }
}

export function updateSettings(
  input: SettingsUpdate,
): { ok: true; settings: PublicSettings } | { ok: false; error: string } {
  const model = typeof input.model === 'string' ? input.model.trim() : ''
  if (!model) return { ok: false, error: 'Enter an OpenRouter model id.' }
  if (model.length > 160 || /\s/.test(model)) {
    return { ok: false, error: 'Use a single model id, such as openai/gpt-4.1-mini.' }
  }

  const current = getStore()
  current.set('model', model)
  const contextDoc = typeof input.contextDoc === 'string' ? input.contextDoc : ''
  current.set('contextDoc', contextDoc.slice(0, MAX_CONTEXT_CHARS))

  if (input.deepgramApiKey?.trim()) current.set('deepgramEnc', seal(input.deepgramApiKey.trim()))
  else if (input.clearDeepgram) current.set('deepgramEnc', '')

  if (input.openrouterApiKey?.trim()) current.set('openrouterEnc', seal(input.openrouterApiKey.trim()))
  else if (input.clearOpenrouter) current.set('openrouterEnc', '')

  return { ok: true, settings: getPublicSettings() }
}
