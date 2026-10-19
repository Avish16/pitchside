import { takeSseMessages } from '@pitchside/shared'

export async function streamBackendAnswer(options: {
  backendUrl: string
  devToken: string
  path?: string
  body: unknown
  onDelta: (text: string) => void
  fetchImpl?: typeof fetch
}): Promise<{ provider: string }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(`${options.backendUrl}${options.path ?? '/v1/answers'}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.devToken}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(options.body),
  })
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail.slice(0, 240) || `Backend ${response.status}`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let rest = ''
  let provider = 'unknown'
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const taken = takeSseMessages(rest + decoder.decode(value, { stream: true }))
    rest = taken.rest
    for (const message of taken.messages) {
      const payload = JSON.parse(message.data) as { text?: string; provider?: string; message?: string }
      if (message.event === 'delta' && payload.text) options.onDelta(payload.text)
      if (message.event === 'done' && payload.provider) provider = payload.provider
      if (message.event === 'error') throw new Error(payload.message || 'The answer failed')
    }
  }
  return { provider }
}
