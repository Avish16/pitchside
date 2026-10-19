import Fastify, { type FastifyInstance } from 'fastify'

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false })
  app.get('/health', async () => ({ ok: true as const, service: 'pitchside' as const }))
  return app
}

export async function startServer(port = Number(process.env.PORT ?? 43124)): Promise<FastifyInstance> {
  const app = buildServer()
  await app.listen({ port, host: '127.0.0.1' })
  return app
}
