import type { CompletionRequest } from '../llm/openrouter'
import { buildMessages } from '../llm/prompts'
import { redactSecrets } from '../shared/redact'
import type { PromptTurn, Speaker } from '../shared/types'
import type { SuggestionEvent, TranscriptEvent } from '../shared/ipc'
import { decideSuggestion } from '../stt/detect'
import type { DeepgramEvent } from '../stt/deepgram-parse'
import type { StreamingTranscriber } from '../stt/deepgram'
import { createUtteranceTracker } from '../stt/utterance'

export interface SessionSettings {
  model: string
  contextDoc: string
  openrouterApiKey: string
}

export interface CallSessionDeps {
  createTranscriber: (
    speaker: Speaker,
    handlers: {
      onEvent: (event: DeepgramEvent) => void
      onError: (error: Error) => void
    },
  ) => StreamingTranscriber
  complete: (request: CompletionRequest) => Promise<void>
  loadSettings: () => SessionSettings
  onTranscript: (event: TranscriptEvent) => void
  onSuggestion: (event: SuggestionEvent) => void
  onError: (message: string) => void
}

export interface CallSession {
  start: (speakers: Speaker[]) => Promise<void>
  sendAudio: (speaker: Speaker, pcm: Buffer) => void
  stop: () => void
  whenIdle: () => Promise<void>
}

export function createCallSession(deps: CallSessionDeps): CallSession {
  const clients = new Map<Speaker, StreamingTranscriber>()
  const trackers = new Map<Speaker, ReturnType<typeof createUtteranceTracker>>()
  const recent: PromptTurn[] = []
  let lastTrigger = ''
  let suggestionAbort: AbortController | null = null
  let chain: Promise<void> = Promise.resolve()
  let sequence = 0

  const nextId = (prefix: string): string => {
    sequence += 1
    return `${prefix}-${sequence}`
  }

  const trackerFor = (speaker: Speaker): ReturnType<typeof createUtteranceTracker> => {
    const existing = trackers.get(speaker)
    if (existing) return existing
    const created = createUtteranceTracker()
    trackers.set(speaker, created)
    return created
  }

  const track = (work: Promise<void>): void => {
    chain = chain.then(() => work).catch(() => undefined)
  }

  const maybeSuggest = (speaker: Speaker, utterance: string): void => {
    const decision = decideSuggestion({ speaker, utterance, lastTrigger })
    if (!decision) return
    lastTrigger = utterance.trim().toLowerCase()
    suggestionAbort?.abort()
    const abort = new AbortController()
    suggestionAbort = abort
    const id = nextId('suggestion')
    deps.onSuggestion({
      type: 'start',
      id,
      kind: decision.kind,
      triggerText: utterance.trim(),
    })

    const work = (async () => {
      const settings = deps.loadSettings()
      try {
        await deps.complete({
          model: settings.model,
          messages: buildMessages({
            contextDoc: settings.contextDoc,
            transcript: recent.slice(),
            triggerKind: decision.kind,
            triggerText: utterance.trim(),
          }),
          signal: abort.signal,
          onDelta: (text) => deps.onSuggestion({ type: 'delta', id, text }),
        })
        if (!abort.signal.aborted) deps.onSuggestion({ type: 'done', id })
      } catch (error) {
        if (abort.signal.aborted) return
        const message = error instanceof Error ? error.message : 'The suggestion failed'
        deps.onSuggestion({
          type: 'error',
          id,
          message: redactSecrets(message, [settings.openrouterApiKey]),
        })
      }
    })()
    track(work)
  }

  const onTranscriptEvent = (speaker: Speaker, event: DeepgramEvent): void => {
    const tracker = trackerFor(speaker)
    if (event.kind === 'utterance_end') {
      const utterance = tracker.flush()
      if (utterance) maybeSuggest(speaker, utterance)
      return
    }
    if (event.kind !== 'transcript') return

    if (!event.isFinal) {
      deps.onTranscript({ type: 'interim', speaker, text: event.text })
      if (event.speechFinal) {
        const utterance = tracker.pushFinal(event.text, true)
        if (utterance) maybeSuggest(speaker, utterance)
      }
      return
    }

    deps.onTranscript({ type: 'final', speaker, id: nextId(speaker), text: event.text })
    recent.push({ speaker, text: event.text })
    if (recent.length > 30) recent.splice(0, recent.length - 30)
    const utterance = tracker.pushFinal(event.text, event.speechFinal)
    if (utterance) maybeSuggest(speaker, utterance)
  }

  return {
    async start(speakers: Speaker[]): Promise<void> {
      this.stop()
      const unique = [...new Set(speakers)]
      const opened: StreamingTranscriber[] = []
      try {
        for (const speaker of unique) {
          const client = deps.createTranscriber(speaker, {
            onEvent: (event) => onTranscriptEvent(speaker, event),
            onError: (error) => deps.onError(redactSecrets(error.message, [])),
          })
          await client.connect()
          opened.push(client)
          clients.set(speaker, client)
        }
      } catch (error) {
        for (const client of opened) client.close()
        clients.clear()
        throw error
      }
    },

    sendAudio(speaker: Speaker, pcm: Buffer): void {
      clients.get(speaker)?.sendAudio(pcm)
    },

    stop(): void {
      suggestionAbort?.abort()
      suggestionAbort = null
      for (const client of clients.values()) client.close()
      clients.clear()
      trackers.clear()
      recent.splice(0, recent.length)
      lastTrigger = ''
    },

    whenIdle(): Promise<void> {
      return chain
    },
  }
}
