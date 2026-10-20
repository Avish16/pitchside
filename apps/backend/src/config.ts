import { existsSync, readFileSync } from 'node:fs'

export function loadEnvFile(filePath: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (env[key] === undefined) env[key] = value
  }
}

export type ModelProviderName = 'xai' | 'anthropic' | 'openrouter' | 'offline'

export const XAI_FAST_MODEL = 'grok-4.3'
export const XAI_DEEP_MODEL = 'grok-4.7'

export interface AppConfig {
  devToken: string
  port: number
  provider: ModelProviderName
  xaiApiKey: string
  anthropicApiKey: string
  openrouterApiKey: string
  deepgramApiKey: string
  fastModel: string
  deepModel: string
  triageModel: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const xaiApiKey = env.XAI_API_KEY?.trim() ?? ''
  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim() ?? ''
  const openrouterApiKey = env.OPENROUTER_API_KEY?.trim() ?? ''
  const requested = (env.LLM_PROVIDER ?? env.PITCHSIDE_PROVIDER)?.trim().toLowerCase()
  const provider = selectProvider(requested, { xaiApiKey, anthropicApiKey, openrouterApiKey })
  const defaults =
    provider === 'xai'
      ? { fast: XAI_FAST_MODEL, deep: XAI_DEEP_MODEL, triage: XAI_FAST_MODEL }
      : { fast: 'claude-haiku-5-5', deep: 'claude-opus-5-5', triage: 'claude-haiku-5-5' }

  return {
    devToken: env.PITCHSIDE_DEV_TOKEN?.trim() || 'pitchside-dev',
    port: Number(env.PORT ?? 43124),
    provider,
    xaiApiKey,
    anthropicApiKey,
    openrouterApiKey,
    deepgramApiKey: env.DEEPGRAM_API_KEY?.trim() ?? '',
    fastModel: env.PITCHSIDE_FAST_MODEL?.trim() || defaults.fast,
    deepModel: env.PITCHSIDE_DEEP_MODEL?.trim() || defaults.deep,
    triageModel: env.PITCHSIDE_TRIAGE_MODEL?.trim() || defaults.triage,
  }
}

function selectProvider(
  requested: string | undefined,
  keys: { xaiApiKey: string; anthropicApiKey: string; openrouterApiKey: string },
): ModelProviderName {
  if (requested === 'offline') return 'offline'
  if (requested === 'xai') return keys.xaiApiKey ? 'xai' : 'offline'
  if (requested === 'anthropic') return keys.anthropicApiKey ? 'anthropic' : 'offline'
  if (requested === 'openrouter') return keys.openrouterApiKey ? 'openrouter' : 'offline'
  if (keys.xaiApiKey) return 'xai'
  if (keys.anthropicApiKey) return 'anthropic'
  if (keys.openrouterApiKey) return 'openrouter'
  return 'offline'
}
