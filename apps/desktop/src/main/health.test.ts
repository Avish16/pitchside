import { describe, expect, it } from 'vitest'
import { readBackendHealth } from './health'

describe('readBackendHealth', () => {
  it('marks a matching payload as up', async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ ok: true, service: 'pitchside' }), { status: 200 })
    expect(await readBackendHealth('http://backend/health', fetchImpl as typeof fetch)).toBe('up')
  })

  it('marks failures as down', async () => {
    const fetchImpl = async () => new Response('nope', { status: 500 })
    expect(await readBackendHealth('http://backend/health', fetchImpl as typeof fetch)).toBe('down')
    const throwing = async () => {
      throw new Error('offline')
    }
    expect(await readBackendHealth('http://backend/health', throwing as typeof fetch)).toBe('down')
  })
})
