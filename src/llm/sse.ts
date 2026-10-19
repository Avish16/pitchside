export type SseInterpretation =
  | { kind: 'delta'; text: string }
  | { kind: 'done' }
  | { kind: 'ignore' }
  | { kind: 'error'; message: string }

export function takeSseLines(buffer: string): { lines: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n')
  const rest = parts.pop() ?? ''
  return { lines: parts, rest }
}

export function interpretSseLine(line: string): SseInterpretation {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) return { kind: 'ignore' }
  if (!trimmed.startsWith('data:')) return { kind: 'ignore' }

  const data = trimmed.slice(5).trim()
  if (data === '[DONE]') return { kind: 'done' }

  try {
    const json = JSON.parse(data) as {
      error?: { message?: string } | string
      choices?: Array<{ delta?: { content?: string } }>
    }
    if (json.error) {
      const message = typeof json.error === 'string' ? json.error : json.error.message || 'OpenRouter error'
      return { kind: 'error', message }
    }
    const text = json.choices?.[0]?.delta?.content
    if (typeof text === 'string' && text.length > 0) return { kind: 'delta', text }
    return { kind: 'ignore' }
  } catch {
    return { kind: 'ignore' }
  }
}
