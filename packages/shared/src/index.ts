export interface HealthStatus {
  ok: true
  service: 'pitchside'
}

export type BackendLink = 'unknown' | 'up' | 'down'

export interface HotkeyLabels {
  toggle: string
  clickThrough: string
  ask: string
  deep: string
}

export interface Snapshot {
  backend: BackendLink
  overlayVisible: boolean
  clickThrough: boolean
  platform: NodeJS.Platform
  hotkeys: HotkeyLabels
}

export interface SharePreview {
  image: string
  note: string
}

export type AnswerMode = 'fast' | 'deep'

export type AnswerEvent =
  | { type: 'start'; id: string; question: string; mode: AnswerMode; citations?: Citation[] }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string; provider: string }
  | { type: 'error'; id: string; message: string }

export interface DesktopSettings {
  devToken: string
  backendUrl: string
  consentAccepted: boolean
}

export type CallPreparation =
  | { ok: true; mode: 'deepgram'; accessToken: string; listenUrl: string; expiresIn: number }
  | { ok: true; mode: 'local'; reason: string }
  | { ok: false; error: string }

export interface AskRequest {
  question: string
  mode: AnswerMode
  context?: string
  notes?: string
  transcript?: string
  citations?: Citation[]
}

export { LIVE_SYSTEM_PROMPT, answerUserPrompt } from './prompts'
export { deepgramListenUrl, deepgramProtocols, parseDeepgramMessage } from './deepgram'
export type { DeepgramInbound } from './deepgram'
export {
  SpeechGate,
  downsample,
  floatToPcm16,
  interleaveStereo,
  pcmBytes,
  rms,
  shouldKeepAlive,
  stereoFrame,
} from './audio'
import type { Citation, KnowledgeHit, KnowledgeKind, KnowledgeSource } from './knowledge'
import type { TranscriptLine } from './transcript'

export type { Citation, IndexedChunk, KnowledgeDoc, KnowledgeHit, KnowledgeKind, KnowledgeSource } from './knowledge'
export {
  chunkText,
  cosine,
  embed,
  formatKnowledge,
  formatRetrieved,
  htmlToText,
  indexDocuments,
  isLikelyQuestion,
  searchChunks,
  tokenize,
} from './knowledge'

export { reduceTranscript, speakerLabel } from './transcript'
export type { Speaker, TranscriptEvent, TranscriptLine } from './transcript'

export function parseHealth(payload: unknown): HealthStatus | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (record.ok !== true || record.service !== 'pitchside') return null
  return { ok: true, service: 'pitchside' }
}

export interface PitchsideBridge {
  getSnapshot: () => Promise<Snapshot>
  refreshHealth: () => Promise<Snapshot>
  showOverlay: () => Promise<void>
  hideOverlay: () => Promise<void>
  showPanel: () => Promise<void>
  toggleClickThrough: () => Promise<boolean>
  testShare: () => Promise<SharePreview>
  quit: () => Promise<void>
  getSettings: () => Promise<DesktopSettings>
  saveSettings: (input: { devToken: string }) => Promise<DesktopSettings>
  acceptConsent: () => Promise<DesktopSettings>
  prepareCall: () => Promise<CallPreparation>
  publishTranscript: (lines: TranscriptLine[]) => Promise<void>
  getTranscript: () => Promise<TranscriptLine[]>
  ask: (input: AskRequest) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  listKnowledge: () => Promise<KnowledgeSource[]>
  addKnowledge: (input: {
    title: string
    text: string
    kind: KnowledgeKind
    triggers?: string[]
  }) => Promise<{ ok: true; source: KnowledgeSource } | { ok: false; error: string }>
  addKnowledgeUrl: (url: string) => Promise<{ ok: true; source: KnowledgeSource } | { ok: false; error: string }>
  openKnowledgeFile: () => Promise<{ ok: true; source: KnowledgeSource } | { ok: false; error: string }>
  removeKnowledge: (id: string) => Promise<KnowledgeSource[]>
  searchKnowledge: (query: string) => Promise<KnowledgeHit[]>
  knowledgeContext: () => Promise<string>
  onSnapshot: (listener: (snapshot: Snapshot) => void) => () => void
  onAskFocus: (listener: () => void) => () => void
  onDeepAsk: (listener: () => void) => () => void
  onAnswer: (listener: (event: AnswerEvent) => void) => () => void
  onTranscript: (listener: (lines: TranscriptLine[]) => void) => () => void
}

export interface SseMessage {
  event: string
  data: string
}

export function takeSseMessages(buffer: string): { messages: SseMessage[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const chunks = normalized.split('\n\n')
  const rest = chunks.pop() ?? ''
  const messages: SseMessage[] = []
  for (const chunk of chunks) {
    if (!chunk.trim()) continue
    let event = 'message'
    const dataLines: string[] = []
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (dataLines.length > 0) messages.push({ event, data: dataLines.join('\n') })
  }
  return { messages, rest }
}
