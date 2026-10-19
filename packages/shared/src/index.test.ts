import { describe, expect, it } from 'vitest'
import { parseHealth, takeSseMessages } from './index'

describe('parseHealth', () => {
  it('accepts the backend health payload', () => {
    expect(parseHealth({ ok: true, service: 'pitchside' })).toEqual({
      ok: true,
      service: 'pitchside',
    })
  })

  it('rejects anything else', () => {
    expect(parseHealth({ ok: true, service: 'other' })).toBeNull()
    expect(parseHealth(null)).toBeNull()
  })
})

describe('takeSseMessages', () => {
  it('reassembles events that were split across chunks', () => {
    const first = takeSseMessages('event: delta\ndata: {"text":"Hel')
    expect(first.messages).toEqual([])
    const second = takeSseMessages(`${first.rest}lo"}\n\nevent: done\ndata: {"provider":"offline"}\n\n`)
    expect(second.messages.map((message) => message.event)).toEqual(['delta', 'done'])
    expect(JSON.parse(second.messages[0]?.data ?? '{}')).toEqual({ text: 'Hello' })
  })
})
