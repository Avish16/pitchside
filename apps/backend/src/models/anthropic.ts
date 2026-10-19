import type { LanguageModel, ModelRequest } from './types'
import { anthropicBody, textFromAnthropicPayload } from './anthropic-format'

export class AnthropicModel implements LanguageModel {
  readonly provider = 'anthropic'

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async *stream(request: ModelRequest): AsyncIterable<string> {
    const response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicBody(request)),
      signal: request.signal,
    })
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Anthropic ${response.status}: ${detail.slice(0, 240)}`)
    }
    yield* yieldAnthropicText(response.body)
  }
}

export async function* yieldAnthropicText(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let rest = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    rest += decoder.decode(value, { stream: true })
    const lines = rest.split('\n')
    rest = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const text = textFromAnthropicPayload(JSON.parse(data))
        if (text) yield text
      } catch {
        // Ignore non-JSON comments in the stream.
      }
    }
  }
}
