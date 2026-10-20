import type { AppConfig } from '../config'
import { AnthropicModel } from './anthropic'
import { OfflineModel } from './offline'
import { OpenRouterModel } from './openrouter'
import type { LanguageModel } from './types'
import { XaiModel } from './xai'

export function createModel(config: AppConfig, fetchImpl: typeof fetch = fetch): LanguageModel {
  if (config.provider === 'xai') return new XaiModel(config.xaiApiKey, fetchImpl)
  if (config.provider === 'anthropic') return new AnthropicModel(config.anthropicApiKey, fetchImpl)
  if (config.provider === 'openrouter') return new OpenRouterModel(config.openrouterApiKey, fetchImpl)
  return new OfflineModel()
}
