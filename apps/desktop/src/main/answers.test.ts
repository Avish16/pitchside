import { describe, expect, it } from 'vitest'
import { streamBackendAnswer } from './answers'

describe('streamBackendAnswer', () => {
  it('forwards deltas from the backend stream', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: delta\ndata: {"text":"• Hello"}\n\nevent: done\ndata: {"provider":"offline"}\n\n',
          ),
        )
        controller.close()
      },
    })
    const deltas: string[] = []
    const result = await streamBackendAnswer({
      backendUrl: 'http://backend',
      devToken: 'pitchside-dev',
      body: { question: 'Price?', mode: 'fast' },
      onDelta: (text) => deltas.push(text),
      fetchImpl: (async () => new Response(body, { status: 200 })) as typeof fetch,
    })
    expect(deltas).toEqual(['• Hello'])
    expect(result.provider).toBe('offline')
  })
})
