import type { PromptTurn, TriggerKind } from '../shared/types'
import { speakerLabel } from '../shared/types'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const SYSTEM_PROMPT = `You are a live copilot for sales, marketing, and customer meetings.
The person using you is on a call. Whisper short talking points they can glance at.
Use only the call context for product facts, prices, and commitments. Do not invent numbers, discounts, features, or customer proof.
If the context does not cover the question, give a careful way to answer and what to confirm afterward.
Write 3 to 5 lines. Each line starts with "• ".
No greeting, no heading, and no closing offer to help further.
Sound like a calm colleague. These are cues, not a script to read aloud word for word.`

export function buildMessages(input: {
  contextDoc: string
  transcript: PromptTurn[]
  triggerKind: TriggerKind
  triggerText: string
}): ChatMessage[] {
  const context = input.contextDoc.trim() || '(No call context was provided. Do not invent product specifics.)'
  const recent = input.transcript.slice(-12).map((turn) => `${speakerLabel(turn.speaker)}: ${turn.text}`)
  const transcript = recent.length > 0 ? recent.join('\n') : '(No earlier transcript.)'
  const kindLabel = input.triggerKind === 'objection' ? 'Objection' : 'Question'
  const guidance =
    input.triggerKind === 'objection'
      ? 'Acknowledge the concern, then offer one concrete next step grounded in the context.'
      : 'Answer the question directly in the first bullet, then add proof or a clarifying question if it helps.'

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        'Call context:',
        context,
        '',
        'Recent transcript:',
        transcript,
        '',
        `${kindLabel} just raised by the other person:`,
        input.triggerText.trim(),
        '',
        guidance,
      ].join('\n'),
    },
  ]
}
