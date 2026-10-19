import type { LanguageModel, ModelRequest } from './types'

export function contentFromOpenRouterPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as {
    error?: { message?: string } | string
    choices?: Array<{ delta?: { content?: string } }>
  }
  if (record.error) {
    const message = typeof record.error === 'string' ? record.error : record.error.message
    throw new Error(message || 'OpenRouter error')
  }
  const text = record.choices?.[0]?.delta?.content
  return typeof text === 'string' && text.length > 0 ? text : null
}

export class OpenRouterModel implements LanguageModel {
  readonly provider = 'openrouter'

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async *stream(request: ModelRequest): AsyncIterable<string> {
    const system = request.cachedContext?.trim()
      ? `${request.system}\n\nCall context:\n${request.cachedContext}`
      : request.system
    const response = await this.fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://127.0.0.1/pitchside',
        'X-Title': 'Pitchside',
      },
      body: JSON.stringify({
        model: request.model,
        stream: true,
        max_tokens: request.maxTokens,
        messages: [{ role: 'system', content: system }, ...request.messages],
      }),
      signal: request.signal,
    })
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 240)}`)
    }
    const reader = response.body.getReader()
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
        const text = contentFromOpenRouterPayload(JSON.parse(data))
        if (text) yield text
      }
    }
  }
}
