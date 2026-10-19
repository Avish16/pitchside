export async function issueDeepgramToken(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetchImpl('https://api.deepgram.com/v1/auth/grant', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl_seconds: 60 }),
  })
  if (!response.ok) {
    throw new Error(`Deepgram grant failed (${response.status})`)
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) throw new Error('Deepgram grant returned no token')
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 60 }
}
