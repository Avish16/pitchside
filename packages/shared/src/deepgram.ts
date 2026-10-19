import type { TranscriptEvent } from './transcript'

export function deepgramListenUrl(): string {
  const params = new URLSearchParams({
    model: 'nova-3',
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '2',
    multichannel: 'true',
    interim_results: 'true',
    punctuate: 'true',
    smart_format: 'true',
    endpointing: '300',
  })
  return `wss://api.deepgram.com/v1/listen?${params.toString()}`
}

export function deepgramProtocols(accessToken: string): [string, string] {
  return ['token', accessToken]
}

export type DeepgramInbound =
  | { type: 'transcript'; event: TranscriptEvent }
  | { type: 'error'; message: string }
  | { type: 'ignore' }

export function parseDeepgramMessage(raw: string): DeepgramInbound {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return { type: 'ignore' }
  }
  if (!payload || typeof payload !== 'object') return { type: 'ignore' }
  const record = payload as Record<string, unknown>
  if (record.type === 'Error') {
    const message = typeof record.description === 'string' ? record.description : 'Deepgram returned an error'
    return { type: 'error', message }
  }
  if (record.type !== 'Results') return { type: 'ignore' }
  const channel = record.channel
  if (!channel || typeof channel !== 'object') return { type: 'ignore' }
  const alternatives = (channel as { alternatives?: unknown }).alternatives
  const first = Array.isArray(alternatives) ? alternatives[0] : null
  const transcript = first && typeof first === 'object' ? (first as { transcript?: unknown }).transcript : ''
  if (typeof transcript !== 'string' || !transcript.trim()) return { type: 'ignore' }
  const index = Array.isArray(record.channel_index) ? record.channel_index[0] : 0
  const speaker = index === 0 ? 'you' : 'client'
  const final = record.is_final === true || record.speech_final === true
  return {
    type: 'transcript',
    event: { type: final ? 'final' : 'partial', speaker, text: transcript },
  }
}
