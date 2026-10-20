import { describe, expect, it } from 'vitest'
import { OfflineModel } from './models/offline'
import type { LanguageModel, ModelRequest } from './models/types'
import { loadConfig, type AppConfig } from './config'
import { anthropicBody, textFromAnthropicPayload } from './models/anthropic-format'
import { buildServer } from './server'

const config: AppConfig = {
  devToken: 'pitchside-dev',
  port: 0,
  provider: 'offline',
  xaiApiKey: '',
  anthropicApiKey: '',
  openrouterApiKey: '',
  deepgramApiKey: '',
  fastModel: 'claude-haiku-5-5',
  deepModel: 'claude-opus-5-5',
  triageModel: 'claude-haiku-5-5',
}

class FakeModel implements LanguageModel {
  readonly provider = 'fake'
  last: ModelRequest | null = null
  async *stream(request: ModelRequest): AsyncIterable<string> {
    this.last = request
    yield '• Quote the list price'
  }
}

function appWith(model = new FakeModel(), extra: Partial<AppConfig> = {}) {
  return buildServer({ config: { ...config, ...extra }, model })
}

describe('backend routes', () => {
  it('serves health without a token', async () => {
    const app = appWith()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('rejects model routes without the dev token', async () => {
    const app = appWith()
    const response = await app.inject({ method: 'POST', url: '/v1/answers', payload: { question: 'Price?' } })
    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('streams an answer and caches the supplied context', async () => {
    const model = new FakeModel()
    const app = appWith(model)
    const response = await app.inject({
      method: 'POST',
      url: '/v1/answers',
      headers: { authorization: 'Bearer pitchside-dev' },
      payload: {
        question: 'What is the seat price?',
        mode: 'fast',
        context: 'Seat price is $40.',
        notes: '[Seat pricing] $40 a month',
      },
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Quote the list price')
    expect(response.body).toContain('"provider":"fake"')
    expect(model.last?.cachedContext).toBe('Seat price is $40.')
    expect(model.last?.messages[0]?.content).toContain('[Seat pricing]')
    expect(model.last?.model).toBe('claude-haiku-5-5')
    expect(model.last?.effort).toBe('low')
    await app.close()
  })

  it('writes the post-call draft with the deep model and only the transcript', async () => {
    const model = new FakeModel()
    const app = appWith(model)
    const response = await app.inject({
      method: 'POST',
      url: '/v1/summary',
      headers: { authorization: 'Bearer pitchside-dev' },
      payload: { transcript: 'Client: What is the seat price?\nYou: Forty dollars.' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Quote the list price')
    expect(model.last?.model).toBe('claude-opus-5-5')
    expect(model.last?.effort).toBe('high')
    expect(model.last?.messages[0]?.content).toContain('Forty dollars')
    expect(model.last?.cachedContext).toBeUndefined()
    await app.close()
  })

  it('uses the deep model when asked', async () => {
    const model = new FakeModel()
    const app = appWith(model)
    await app.inject({
      method: 'POST',
      url: '/v1/answers',
      headers: { authorization: 'Bearer pitchside-dev' },
      payload: { question: 'Walk me through the rollout', mode: 'deep' },
    })
    expect(model.last?.model).toBe('claude-opus-5-5')
    expect(model.last?.effort).toBe('high')
    await app.close()
  })

  it('returns a short-lived Deepgram token and hides the provider key', async () => {
    const seen: string[] = []
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      seen.push(String((init?.headers as Record<string, string>).Authorization))
      return new Response(JSON.stringify({ access_token: 'dg-temp', expires_in: 60 }), { status: 200 })
    }) as typeof fetch
    const app = buildServer({
      config: { ...config, deepgramApiKey: 'dg-secret' },
      model: new FakeModel(),
      fetchImpl,
    })
    const missing = await app.inject({
      method: 'POST',
      url: '/v1/deepgram/token',
      headers: { authorization: 'Bearer pitchside-dev' },
    })
    expect(missing.statusCode).toBe(200)
    expect(missing.json()).toEqual({ accessToken: 'dg-temp', expiresIn: 60 })
    expect(missing.body).not.toContain('dg-secret')
    expect(seen[0]).toBe('Token dg-secret')
    await app.close()
  })

  it('classifies an ambiguous line with the triage model', async () => {
    const model = new FakeModel()
    model.stream = async function* (request: ModelRequest) {
      model.last = request
      yield '{"kind":"objection","confidence":0.81}'
    }
    const app = appWith(model)
    const response = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { authorization: 'Bearer pitchside-dev' },
      payload: { text: 'Is the price too expensive to move forward?' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ kind: 'objection', source: 'model' })
    expect(model.last?.model).toBe('claude-haiku-5-5')
    expect(model.last?.effort).toBe('low')
    await app.close()
  })

  it('skips the model when the provider is offline', async () => {
    const app = buildServer({ config, model: new OfflineModel() })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/triage',
      headers: { authorization: 'Bearer pitchside-dev' },
      payload: { text: 'hello' },
    })
    expect(response.json()).toMatchObject({ source: 'offline' })
    await app.close()
  })

  it('reports when Deepgram is not configured', async () => {
    const app = appWith()
    const response = await app.inject({
      method: 'POST',
      url: '/v1/deepgram/token',
      headers: { authorization: 'Bearer pitchside-dev' },
    })
    expect(response.statusCode).toBe(503)
    await app.close()
  })
})

describe('provider request shape', () => {
  it('marks the system prompt and the knowledge block for Anthropic prompt caching', () => {
    const body = anthropicBody({
      model: 'claude-haiku-5-5',
      system: 'Be brief.',
      cachedContext: 'Seat price is $40.',
      messages: [{ role: 'user', content: 'Price?' }],
      maxTokens: 200,
      effort: 'low',
    })
    const system = body.system as Array<{ text: string; cache_control: { type: string } }>
    expect(system).toHaveLength(2)
    expect(system.every((block) => block.cache_control.type === 'ephemeral')).toBe(true)
    expect(system[1]?.text).toContain('$40')
  })

  it('keeps thinking text out of the spoken answer', () => {
    expect(textFromAnthropicPayload({ type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'secret' } })).toBeNull()
    expect(textFromAnthropicPayload({ type: 'content_block_delta', delta: { type: 'text_delta', text: '• Hi' } })).toBe('• Hi')
  })
})

describe('loadConfig', () => {
  it('stays offline until a provider key exists', () => {
    expect(loadConfig({}).provider).toBe('offline')
    expect(loadConfig({ ANTHROPIC_API_KEY: 'sk' }).provider).toBe('anthropic')
    expect(loadConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk' }).provider).toBe('anthropic')
    expect(loadConfig({ PITCHSIDE_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'sk' }).fastModel).toBe('claude-haiku-5-5')
  })

  it('selects xAI from LLM_PROVIDER and defaults to the public Grok ids', () => {
    const config = loadConfig({ LLM_PROVIDER: 'xai', XAI_API_KEY: 'xai-secret' })
    expect(config.provider).toBe('xai')
    expect(config.fastModel).toBe('grok-4.3')
    expect(config.triageModel).toBe('grok-4.3')
    expect(config.deepModel).toBe('grok-4.7')
    expect(loadConfig({ LLM_PROVIDER: 'xai' }).provider).toBe('offline')
    expect(loadConfig({ XAI_API_KEY: 'xai-secret', PITCHSIDE_FAST_MODEL: 'grok-4.3' }).provider).toBe('xai')
  })
})
