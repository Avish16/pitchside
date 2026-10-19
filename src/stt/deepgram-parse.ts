export type DeepgramEvent =
  | { kind: 'transcript'; text: string; isFinal: boolean; speechFinal: boolean }
  | { kind: 'utterance_end' }
  | { kind: 'error'; message: string }
  | { kind: 'ignore' }

export function deepgramListenUrl(sampleRate: number): string {
  const params = new URLSearchParams({
    model: 'nova-3',
    encoding: 'linear16',
    sample_rate: String(sampleRate),
    channels: '1',
    interim_results: 'true',
    punctuate: 'true',
    smart_format: 'true',
    endpointing: '400',
    utterance_end_ms: '1000',
    vad_events: 'true',
  })
  return `wss://api.deepgram.com/v1/listen?${params.toString()}`
}

export function parseDeepgramMessage(raw: string): DeepgramEvent {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { kind: 'ignore' }
  }
  if (!data || typeof data !== 'object') return { kind: 'ignore' }

  const record = data as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''

  if (type === 'UtteranceEnd') return { kind: 'utterance_end' }

  if (type === 'Error' || record.error) {
    const description = typeof record.description === 'string' ? record.description : ''
    const message = typeof record.message === 'string' ? record.message : ''
    return { kind: 'error', message: description || message || 'Deepgram error' }
  }

  if (type && type !== 'Results') return { kind: 'ignore' }

  const channel = record.channel as { alternatives?: Array<{ transcript?: string }> } | undefined
  const text = channel?.alternatives?.[0]?.transcript?.trim() ?? ''
  if (!text) return { kind: 'ignore' }

  return {
    kind: 'transcript',
    text,
    isFinal: Boolean(record.is_final),
    speechFinal: Boolean(record.speech_final),
  }
}
