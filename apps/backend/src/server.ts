import { Readable } from 'node:stream'
import Fastify, { type FastifyInstance } from 'fastify'
import { LIVE_SYSTEM_PROMPT, answerUserPrompt } from '@pitchside/shared'
import { devTokenAuthenticator } from './auth'
import { loadConfig, type AppConfig } from './config'
import { issueDeepgramToken } from './deepgram-token'
import { createModel } from './models/create'
import type { LanguageModel } from './models/types'

export interface ServerDeps {
  config: AppConfig
  model: LanguageModel
  fetchImpl?: typeof fetch
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function buildServer(deps: ServerDeps = defaultDeps()): FastifyInstance {
  const app = Fastify({ logger: false })
  const auth = devTokenAuthenticator(deps.config.devToken)
  const fetchImpl = deps.fetchImpl ?? fetch

  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return
    const result = auth.authenticate(request.headers.authorization)
    if (!result.ok) return reply.code(401).send({ error: 'unauthorized' })
  })

  app.get('/health', async () => ({ ok: true as const, service: 'pitchside' as const }))

  app.post('/v1/deepgram/token', async (_request, reply) => {
    if (!deps.config.deepgramApiKey) {
      return reply.code(503).send({ error: 'deepgram_not_configured' })
    }
    try {
      const token = await issueDeepgramToken(deps.config.deepgramApiKey, fetchImpl)
      return token
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deepgram grant failed'
      return reply.code(502).send({ error: 'deepgram_grant_failed', message })
    }
  })

  app.post('/v1/warmup', async () => {
    const iterator = deps.model.stream({
      model: deps.config.fastModel,
      system: LIVE_SYSTEM_PROMPT,
      cachedContext: 'Pitchside knowledge cache.',
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 16,
      effort: 'low',
    })
    for await (const _chunk of iterator) {
      break
    }
    return { ok: true, provider: deps.model.provider }
  })

  app.post<{ Body: { question?: string; mode?: string; context?: string; transcript?: string } }>(
    '/v1/answers',
    async (request, reply) => {
      const question = request.body?.question?.trim() ?? ''
      if (!question) return reply.code(400).send({ error: 'question_required' })
      const mode = request.body?.mode === 'deep' ? 'deep' : 'fast'
      const modelId = mode === 'deep' ? deps.config.deepModel : deps.config.fastModel
      const abort = new AbortController()
      request.raw.on('close', () => abort.abort())

      const stream = Readable.from(
        (async function* () {
          try {
            const iterator = deps.model.stream({
              model: modelId,
              system: LIVE_SYSTEM_PROMPT,
              cachedContext: request.body?.context,
              messages: [{ role: 'user', content: answerUserPrompt({ question, transcript: request.body?.transcript }) }],
              maxTokens: mode === 'deep' ? 900 : 320,
              effort: mode === 'deep' ? 'high' : 'low',
              signal: abort.signal,
            })
            for await (const text of iterator) {
              if (text) yield sse('delta', { text })
            }
            yield sse('done', { provider: deps.model.provider, model: modelId })
          } catch (error) {
            if (abort.signal.aborted) return
            const message = error instanceof Error ? error.message : 'The model request failed'
            yield sse('error', { message: message.slice(0, 300) })
          }
        })(),
      )
      return reply.type('text/event-stream').send(stream)
    },
  )

  return app
}

function defaultDeps(): ServerDeps {
  const config = loadConfig()
  return { config, model: createModel(config) }
}

export async function startServer(port = loadConfig().port): Promise<FastifyInstance> {
  const app = buildServer()
  await app.listen({ port, host: '127.0.0.1' })
  return app
}
