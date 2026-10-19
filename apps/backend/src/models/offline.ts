import type { LanguageModel, ModelRequest } from './types'

export class OfflineModel implements LanguageModel {
  readonly provider = 'offline'

  async *stream(request: ModelRequest): AsyncIterable<string> {
    const question = request.messages.at(-1)?.content ?? ''
    yield '[offline demo] No model key is configured. '
    if (request.cachedContext?.trim()) {
      yield `Local context: ${request.cachedContext.trim().slice(0, 320)} `
    }
    yield `For this question, confirm the fact in your notes before you quote a number. ${question.slice(0, 180)}`
  }
}
