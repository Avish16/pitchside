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

export type ModelProviderName = 'anthropic' | 'openrouter' | 'offline'

export interface AppConfig {
  devToken: string
  port: number
  provider: ModelProviderName
  anthropicApiKey: string
  openrouterApiKey: string
  deepgramApiKey: string
  fastModel: string
  deepModel: string
  triageModel: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim() ?? ''
  const openrouterApiKey = env.OPENROUTER_API_KEY?.trim() ?? ''
  const requested = env.PITCHSIDE_PROVIDER?.trim()
  let provider: ModelProviderName = 'offline'
  if (requested === 'openrouter' && openrouterApiKey) provider = 'openrouter'
  else if (requested === 'anthropic' && anthropicApiKey) provider = 'anthropic'
  else if (requested === 'offline') provider = 'offline'
  else if (anthropicApiKey) provider = 'anthropic'
  else if (openrouterApiKey) provider = 'openrouter'

  return {
    devToken: env.PITCHSIDE_DEV_TOKEN?.trim() || 'pitchside-dev',
    port: Number(env.PORT ?? 43124),
    provider,
    anthropicApiKey,
    openrouterApiKey,
    deepgramApiKey: env.DEEPGRAM_API_KEY?.trim() ?? '',
    fastModel: env.PITCHSIDE_FAST_MODEL?.trim() || 'claude-haiku-5-5',
    deepModel: env.PITCHSIDE_DEEP_MODEL?.trim() || 'claude-opus-5-5',
    triageModel: env.PITCHSIDE_TRIAGE_MODEL?.trim() || 'claude-haiku-5-5',
  }
}
