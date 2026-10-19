import type { ModelRequest } from './types'

export function anthropicBody(request: ModelRequest): Record<string, unknown> {
  const system: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: request.system,
      cache_control: { type: 'ephemeral' },
    },
  ]
  if (request.cachedContext?.trim()) {
    system.push({
      type: 'text',
      text: request.cachedContext,
      cache_control: { type: 'ephemeral' },
    })
  }
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    stream: true,
    thinking: { type: 'adaptive' },
    output_config: { effort: request.effort },
    system,
    messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
  }
}

export function textFromAnthropicPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as { type?: string; delta?: { type?: string; text?: string } }
  if (record.type !== 'content_block_delta') return null
  if (record.delta?.type !== 'text_delta') return null
  return typeof record.delta.text === 'string' ? record.delta.text : null
}
