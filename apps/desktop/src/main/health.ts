import { parseHealth, type BackendLink } from '@pitchside/shared'

export const BACKEND_URL = process.env.PITCHSIDE_BACKEND_URL ?? 'http://127.0.0.1:43124'

export async function readBackendHealth(
  url = `${BACKEND_URL}/health`,
  fetchImpl: typeof fetch = fetch,
): Promise<BackendLink> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(1500) })
    if (!response.ok) return 'down'
    const body: unknown = await response.json()
    return parseHealth(body) ? 'up' : 'down'
  } catch {
    return 'down'
  }
}
