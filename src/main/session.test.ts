import { describe, expect, it } from 'vitest'
import type { CompletionRequest } from '../llm/openrouter'
import type { SuggestionEvent, TranscriptEvent } from '../shared/ipc'
import type { Speaker } from '../shared/types'
import type { DeepgramEvent } from '../stt/deepgram-parse'
import type { StreamingTranscriber } from '../stt/deepgram'
import { createCallSession } from './session'

function setup(complete: (request: CompletionRequest) => Promise<void> = async () => undefined) {
  const transcripts: TranscriptEvent[] = []
  const suggestions: SuggestionEvent[] = []
  const errors: string[] = []
  let handlers: {
    onEvent: (event: DeepgramEvent) => void
    onError: (error: Error) => void
  } | null = null
  const closed: Speaker[] = []

  const session = createCallSession({
    createTranscriber: (speaker, next) => {
      handlers = next
      const client: StreamingTranscriber = {
        connect: async () => undefined,
        sendAudio: () => undefined,
        close: () => {
          closed.push(speaker)
        },
      }
      return client
    },
    complete,
    loadSettings: () => ({
      model: 'openai/gpt-4.1-mini',
      contextDoc: 'Widget costs $10.',
      openrouterApiKey: 'sk-test-secret',
    }),
    onTranscript: (event) => transcripts.push(event),
    onSuggestion: (event) => suggestions.push(event),
    onError: (message) => errors.push(message),
  })

  return {
    session,
    transcripts,
    suggestions,
    errors,
    closed,
    emit: (event: DeepgramEvent) => handlers?.onEvent(event),
  }
}

describe('createCallSession', () => {
  it('streams a suggestion when the other person finishes a question', async () => {
    const seen: string[] = []
    const harness = setup(async (request) => {
      seen.push(request.messages.map((message) => message.content).join('\n'))
      request.onDelta('• Quote the $10 price')
    })
    await harness.session.start(['them'])
    harness.emit({ kind: 'transcript', text: 'How does', isFinal: true, speechFinal: false })
    harness.emit({ kind: 'transcript', text: 'pricing work?', isFinal: true, speechFinal: true })
    await harness.session.whenIdle()

    expect(harness.transcripts.map((event) => event.type)).toEqual(['final', 'final'])
    expect(harness.suggestions[0]).toMatchObject({
      type: 'start',
      kind: 'question',
      triggerText: 'How does pricing work?',
    })
    expect(harness.suggestions.some((event) => event.type === 'delta' && event.text.includes('$10'))).toBe(
      true,
    )
    expect(harness.suggestions.at(-1)?.type).toBe('done')
    expect(seen[0]).toContain('Widget costs $10.')
  })

  it('does not suggest answers to the user or to interim speech', async () => {
    let calls = 0
    const harness = setup(async () => {
      calls += 1
    })
    await harness.session.start(['you'])
    harness.emit({
      kind: 'transcript',
      text: 'How much does the annual plan cost?',
      isFinal: true,
      speechFinal: true,
    })
    await harness.session.whenIdle()
    expect(calls).toBe(0)

    await harness.session.start(['them'])
    harness.emit({
      kind: 'transcript',
      text: 'How much does the annual plan cost?',
      isFinal: false,
      speechFinal: false,
    })
    await harness.session.whenIdle()
    expect(calls).toBe(0)
    expect(harness.transcripts.at(-1)).toMatchObject({ type: 'interim' })
  })

  it('reports a suggestion error without the provider key', async () => {
    const harness = setup(async () => {
      throw new Error('rejected sk-test-secret')
    })
    await harness.session.start(['them'])
    harness.emit({
      kind: 'transcript',
      text: 'We have no budget this year.',
      isFinal: true,
      speechFinal: true,
    })
    await harness.session.whenIdle()
    const error = harness.suggestions.find((event) => event.type === 'error')
    expect(error).toMatchObject({ type: 'error' })
    if (error?.type === 'error') {
      expect(error.message).toContain('••••')
      expect(error.message).not.toContain('sk-test-secret')
    }
  })

  it('closes transcribers when the session stops', async () => {
    const harness = setup()
    await harness.session.start(['you', 'them'])
    harness.session.stop()
    expect(harness.closed.sort()).toEqual(['them', 'you'])
  })
})
