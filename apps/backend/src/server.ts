import { Readable } from 'node:stream'
import Fastify, { type FastifyInstance } from 'fastify'
import { LIVE_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, answerUserPrompt, parseTriageJson, summaryUserPrompt } from '@pitchside/shared'
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

  app.post<{ Body: { context?: string } }>('/v1/warmup', async (request) => {
    const cachedContext = request.body?.context?.trim() || 'Pitchside knowledge cache.'
    const iterator = deps.model.stream({
      model: deps.config.fastModel,
      system: LIVE_SYSTEM_PROMPT,
      cachedContext,
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 16,
      effort: 'low',
    })
    for await (const _chunk of iterator) {
      break
    }
    return { ok: true, provider: deps.model.provider }
  })

  app.post<{ Body: { text?: string } }>('/v1/triage', async (request, reply) => {
    const text = request.body?.text?.trim() ?? ''
    if (!text) return reply.code(400).send({ error: 'text_required' })
    if (deps.model.provider === 'offline') return { kind: 'other', confidence: 0, source: 'offline' as const }
    let raw = ''
    const iterator = deps.model.stream({
      model: deps.config.triageModel,
      system:
        'Classify one line from a sales call. Reply with JSON only: {"kind":"question|objection|buying_signal|small_talk|other","confidence":0.0}',
      messages: [{ role: 'user', content: text.slice(0, 600) }],
      maxTokens: 80,
      effort: 'low',
    })
    for await (const chunk of iterator) raw += chunk
    const parsed = parseTriageJson(raw)
    if (!parsed) return { kind: 'other' as const, confidence: 0, source: 'model' as const }
    return { ...parsed, source: 'model' as const }
  })

  app.post<{ Body: { transcript?: string } }>('/v1/summary', async (request, reply) => {
    const transcript = request.body?.transcript?.trim() ?? ''
    if (!transcript) return reply.code(400).send({ error: 'transcript_required' })
    const abort = new AbortController()
    request.raw.on('close', () => abort.abort())
    const stream = Readable.from(
      (async function* () {
        try {
          const iterator = deps.model.stream({
            model: deps.config.deepModel,
            system: SUMMARY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: summaryUserPrompt(transcript) }],
            maxTokens: 900,
            effort: 'high',
            signal: abort.signal,
          })
          for await (const text of iterator) {
            if (text) yield sse('delta', { text })
          }
          yield sse('done', { provider: deps.model.provider, model: deps.config.deepModel })
        } catch (error) {
          if (abort.signal.aborted) return
          const message = error instanceof Error ? error.message : 'The summary failed'
          yield sse('error', { message: message.slice(0, 300) })
        }
      })(),
    )
    return reply.type('text/event-stream').send(stream)
  })

  app.post<{ Body: { question?: string; mode?: string; context?: string; notes?: string; transcript?: string } }>(
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
              messages: [
                {
                  role: 'user',
                  content: answerUserPrompt({
                    question,
                    transcript: request.body?.transcript,
                    notes: request.body?.notes,
                  }),
                },
              ],
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
