import type { LanguageModel, ModelRequest } from './types'
import { contentFromOpenRouterPayload } from './openrouter'

export const XAI_CHAT_URL = 'https://api.x.ai/v1/chat/completions'

/** Stable sticky-routing key. xAI has no Anthropic-style cache_control blocks. */
export function xaiPromptCacheKey(prefix: string): string {
  let hash = 2166136261
  for (let index = 0; index < prefix.length; index += 1) {
    hash ^= prefix.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `pitchside-${(hash >>> 0).toString(16)}`
}

export function xaiBody(request: ModelRequest): Record<string, unknown> {
  const context = request.cachedContext?.trim() ?? ''
  const system = context ? `${request.system}\n\nCall context:\n${context}` : request.system
  const body: Record<string, unknown> = {
    model: request.model,
    stream: true,
    max_completion_tokens: request.maxTokens,
    reasoning_effort: request.effort,
    messages: [{ role: 'system', content: system }, ...request.messages],
  }
  if (context) body.prompt_cache_key = xaiPromptCacheKey(`${request.system}\n${context}`)
  return body
}

export class XaiModel implements LanguageModel {
  readonly provider = 'xai'

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async *stream(request: ModelRequest): AsyncIterable<string> {
    const response = await this.fetchImpl(XAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(xaiBody(request)),
      signal: request.signal,
    })
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      throw new Error(`xAI ${response.status}: ${detail.slice(0, 240)}`)
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
