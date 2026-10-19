import type {
  AppState,
  PublicSettings,
  SettingsUpdate,
} from './types'
import type {
  AudioChunk,
  SaveSettingsResult,
  StartSessionRequest,
  StartSessionResult,
  StatusEvent,
  SuggestionEvent,
  TranscriptEvent,
} from './ipc'

export interface CopilotBridge {
  getState: () => Promise<AppState>
  saveSettings: (input: SettingsUpdate) => Promise<SaveSettingsResult>
  openExternal: (url: string) => Promise<boolean>
  startSession: (input: StartSessionRequest) => Promise<StartSessionResult>
  stopSession: () => Promise<void>
  sendAudio: (chunk: AudioChunk) => void
  hide: () => void
  toggleClickThrough: () => Promise<boolean>
  quit: () => void
  onTranscript: (listener: (event: TranscriptEvent) => void) => () => void
  onSuggestion: (listener: (event: SuggestionEvent) => void) => () => void
  onStatus: (listener: (event: StatusEvent) => void) => () => void
}

export type { AppState, PublicSettings, SettingsUpdate }
