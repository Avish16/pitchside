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
  | { type: 'start'; id: string; question: string; mode: AnswerMode }
  | { type: 'delta'; id: string; text: string }
  | { type: 'done'; id: string; provider: string }
  | { type: 'error'; id: string; message: string }

export interface DesktopSettings {
  devToken: string
  backendUrl: string
}

export interface AskRequest {
  question: string
  mode: AnswerMode
  context?: string
  transcript?: string
}

export { LIVE_SYSTEM_PROMPT, answerUserPrompt } from './prompts'

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
  ask: (input: AskRequest) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  onSnapshot: (listener: (snapshot: Snapshot) => void) => () => void
  onAskFocus: (listener: () => void) => () => void
  onDeepAsk: (listener: () => void) => () => void
  onAnswer: (listener: (event: AnswerEvent) => void) => () => void
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
