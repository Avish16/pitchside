export type Effort = 'low' | 'medium' | 'high'

export interface ModelTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ModelRequest {
  model: string
  system: string
  cachedContext?: string
  messages: ModelTurn[]
  maxTokens: number
  effort: Effort
  signal?: AbortSignal
}

export interface LanguageModel {
  readonly provider: string
  stream: (request: ModelRequest) => AsyncIterable<string>
}
