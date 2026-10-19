import { describe, expect, it } from 'vitest'
import { interpretSseLine, takeSseLines } from './sse'

describe('OpenRouter SSE parsing', () => {
  it('reassembles deltas that arrive split across chunks', () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choi',
      'ces":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n',
    ]
    let rest = ''
    const deltas: string[] = []
    let done = false
    for (const chunk of chunks) {
      const taken = takeSseLines(rest + chunk)
      rest = taken.rest
      for (const line of taken.lines) {
        const parsed = interpretSseLine(line)
        if (parsed.kind === 'delta') deltas.push(parsed.text)
        if (parsed.kind === 'done') done = true
      }
    }
    expect(deltas.join('')).toBe('Hello')
    expect(done).toBe(true)
    expect(rest).toBe('')
  })

  it('surfaces provider errors and ignores comments', () => {
    expect(interpretSseLine(': OPENROUTER PROCESSING').kind).toBe('ignore')
    expect(interpretSseLine('data: {"error":{"message":"Invalid model"}}')).toEqual({
      kind: 'error',
      message: 'Invalid model',
    })
  })
})
