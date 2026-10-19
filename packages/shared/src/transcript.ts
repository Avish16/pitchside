export type Speaker = 'you' | 'client'

export interface TranscriptLine {
  id: string
  speaker: Speaker
  text: string
  final: boolean
}

export type TranscriptEvent =
  | { type: 'partial'; speaker: Speaker; text: string }
  | { type: 'final'; speaker: Speaker; text: string }

export function speakerLabel(speaker: Speaker): 'You' | 'Client' {
  return speaker === 'you' ? 'You' : 'Client'
}

export function reduceTranscript(
  lines: TranscriptLine[],
  event: TranscriptEvent,
  nextId: () => string,
): TranscriptLine[] {
  const text = event.text.replace(/\s+/g, ' ').trim()
  if (!text) return lines
  const partialIndex = lines.findIndex((line) => line.speaker === event.speaker && !line.final)
  if (partialIndex === -1) {
    return [...lines, { id: nextId(), speaker: event.speaker, text, final: event.type === 'final' }]
  }
  return lines.map((line, index) =>
    index === partialIndex ? { ...line, text, final: event.type === 'final' } : line,
  )
}
