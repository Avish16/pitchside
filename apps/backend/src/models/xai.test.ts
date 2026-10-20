import { describe, expect, it } from 'vitest'
import type { ModelRequest } from './types'
import { XaiModel, XAI_CHAT_URL, xaiBody, xaiPromptCacheKey } from './xai'

const request: ModelRequest = {
  model: 'grok-4.3',
  system: 'Be brief.',
  cachedContext: 'Seat price is $40.',
  messages: [{ role: 'user', content: 'Price?' }],
  maxTokens: 200,
  effort: 'low',
}

describe('xAI requests', () => {
  it('sends an OpenAI-compatible body and a cache key instead of cache_control', () => {
    const body = xaiBody(request)
    expect(body.model).toBe('grok-4.3')
    expect(body.reasoning_effort).toBe('low')
    expect(body.prompt_cache_key).toBe(xaiPromptCacheKey('Be brief.\nSeat price is $40.'))
    expect(JSON.stringify(body)).not.toContain('cache_control')
    expect(JSON.stringify(body)).toContain('Seat price is $40.')
    expect(xaiBody({ ...request, cachedContext: undefined }).prompt_cache_key).toBeUndefined()
  })

  it('streams chat deltas from api.x.ai and keeps the key out of the request body', async () => {
    let url = ''
    let auth = ''
    let sent = ''
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"choices":[{"delta":{"content":"• $40"}}]}\n\ndata: [DONE]\n\n'),
        )
        controller.close()
      },
    })
    const fetchImpl = (async (input: string, init?: RequestInit) => {
      url = input
      auth = String((init?.headers as Record<string, string>).Authorization)
      sent = String(init?.body)
      return new Response(body, { status: 200 })
    }) as typeof fetch
    const chunks: string[] = []
    for await (const text of new XaiModel('xai-secret', fetchImpl).stream(request)) chunks.push(text)
    expect(url).toBe(XAI_CHAT_URL)
    expect(auth).toBe('Bearer xai-secret')
    expect(sent).not.toContain('xai-secret')
    expect(chunks).toEqual(['• $40'])
  })
})
