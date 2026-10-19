const ALLOWED_HOSTS = new Set(['console.deepgram.com', 'openrouter.ai'])

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}
