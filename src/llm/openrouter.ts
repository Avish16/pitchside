import type { ChatMessage } from './prompts'
import { interpretSseLine, takeSseLines } from './sse'

export interface CompletionRequest {
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
  onDelta: (text: string) => void
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function streamChat(input: CompletionRequest & { apiKey: string }): Promise<void> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost/call-copilot',
      'X-Title': 'Call Copilot',
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 320,
    }),
    signal: input.signal,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 240)}`)
  }
  if (!response.body) throw new Error('OpenRouter returned an empty stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let rest = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const taken = takeSseLines(rest + decoder.decode(value, { stream: true }))
    rest = taken.rest
    for (const line of taken.lines) {
      const parsed = interpretSseLine(line)
      if (parsed.kind === 'delta') input.onDelta(parsed.text)
      if (parsed.kind === 'error') throw new Error(parsed.message)
    }
  }
}
