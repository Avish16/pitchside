import { deepgramListenUrl, type CallPreparation } from '@pitchside/shared'

export async function prepareCall(options: {
  consentAccepted: boolean
  backendUrl: string
  devToken: string
  fetchImpl?: typeof fetch
}): Promise<CallPreparation> {
  if (!options.consentAccepted) {
    return { ok: false, error: 'Accept the recording reminder before listening.' }
  }
  const fetchImpl = options.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(`${options.backendUrl}/v1/deepgram/token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.devToken}` },
    })
    if (response.status === 503) {
      return {
        ok: true,
        mode: 'local',
        reason: 'Deepgram is not configured on the backend. Practice lines still stay on this computer.',
      }
    }
    if (!response.ok) {
      return {
        ok: true,
        mode: 'local',
        reason: 'The transcription service did not grant a token. Practice lines still stay on this computer.',
      }
    }
    const body = (await response.json()) as { accessToken?: string; expiresIn?: number }
    if (!body.accessToken) {
      return { ok: true, mode: 'local', reason: 'The transcription token was empty. Practice lines still work.' }
    }
    return {
      ok: true,
      mode: 'deepgram',
      accessToken: body.accessToken,
      listenUrl: deepgramListenUrl(),
      expiresIn: body.expiresIn ?? 60,
    }
  } catch {
    return { ok: true, mode: 'local', reason: 'The backend is unreachable. Practice lines stay on this computer.' }
  }
}
