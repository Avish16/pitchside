import {
  resolveTriage,
  triageLocal,
  type TriageKind,
  type TriageNotice,
} from '@pitchside/shared'

export async function classifyUtterance(options: {
  text: string
  matchCard: (text: string) => { title: string; excerpt: string } | null
  fetchRemote: (text: string) => Promise<{ kind: TriageKind; confidence: number; source?: 'model' | 'offline' } | null>
}): Promise<TriageNotice> {
  const local = triageLocal(options.text)
  const remote = local.confidence < 0.62 ? await options.fetchRemote(options.text).catch(() => null) : null
  const chosen = resolveTriage(local, remote)
  const battlecard =
    chosen.kind === 'objection' || chosen.kind === 'buying_signal' ? options.matchCard(options.text) : null
  return { text: options.text, kind: chosen.kind, source: chosen.source, battlecard }
}

export async function fetchRemoteTriage(options: {
  backendUrl: string
  devToken: string
  text: string
  fetchImpl?: typeof fetch
}): Promise<{ kind: TriageKind; confidence: number; source?: 'model' | 'offline' } | null> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(`${options.backendUrl}/v1/triage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.devToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: options.text }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const body = (await response.json()) as { kind?: TriageKind; confidence?: number; source?: 'model' | 'offline' }
  if (!body.kind || typeof body.confidence !== 'number') return null
  return { kind: body.kind, confidence: body.confidence, source: body.source }
}
