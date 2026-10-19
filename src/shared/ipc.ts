import type { Speaker, TriggerKind } from './types'

export const IpcChannel = {
  getState: 'app:get-state',
  saveSettings: 'settings:save',
  openExternal: 'app:open-external',
  startSession: 'session:start',
  stopSession: 'session:stop',
  audioChunk: 'audio:chunk',
  hide: 'overlay:hide',
  toggleClickThrough: 'overlay:toggle-click-through',
  quit: 'app:quit',
  transcript: 'transcript',
  suggestion: 'suggestion',
  status: 'status',
} as const

export type TranscriptEvent =
  | { type: 'interim'; speaker: Speaker; text: string }
  | { type: 'final'; speaker: Speaker; id: string; text: string }

export type SuggestionEvent =
  | { type: 'start'; id: string; kind: TriggerKind; triggerText: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string }
  | { type: 'error'; id: string; message: string }

export type StatusEvent =
  | { type: 'click-through'; enabled: boolean }
  | { type: 'error'; message: string }
  | { type: 'session'; state: 'idle' | 'live' }

export interface AudioChunk {
  speaker: Speaker
  audio: string
}

export interface StartSessionRequest {
  channels: Speaker[]
}

export type StartSessionResult = { ok: true } | { ok: false; error: string }

export type SaveSettingsResult =
  | { ok: true; settings: import('./types').PublicSettings }
  | { ok: false; error: string }

export function isSpeaker(value: unknown): value is Speaker {
  return value === 'you' || value === 'them'
}
