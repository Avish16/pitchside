export type TriageKind = 'question' | 'objection' | 'buying_signal' | 'small_talk' | 'other'

export interface LocalTriage {
  kind: TriageKind
  confidence: number
  matched: string[]
}

export interface TriageNotice {
  text: string
  kind: TriageKind
  source: 'local' | 'model' | 'offline'
  battlecard: { title: string; excerpt: string } | null
}

const QUESTION_START = /^(what|how|why|when|where|who|which|can|could|do|does|did|is|are|will|would|should)\b/i

const OBJECTIONS = [
  'too expensive',
  'too much',
  'budget',
  'cheaper',
  'cost',
  'already have',
  'not sure',
  'concern',
  'risky',
  'risk',
  'security',
  'think about it',
  'circle back',
  'competitor',
  'contract is long',
  "can't afford",
  'cannot afford',
]

const BUYING = [
  'send the contract',
  'send a contract',
  'move forward',
  'next steps',
  'when can we start',
  'procurement',
  "let's do it",
  'lets do it',
  'pricing works',
  'ready to buy',
  'sign',
  'pilot',
  'timeline to start',
]

const SMALL_TALK = [
  'thanks',
  'thank you',
  'hello',
  'hi ',
  'hey ',
  'how are you',
  'good morning',
  'good afternoon',
  'weather',
  'weekend',
  'nice to meet',
  'sounds good',
  'talk soon',
  'bye',
  'okay',
  'ok',
  'yeah',
  'yep',
  'cool',
  'great',
  'perfect',
]

const KINDS: TriageKind[] = ['question', 'objection', 'buying_signal', 'small_talk', 'other']

export function triageLocal(text: string): LocalTriage {
  const clean = text.replace(/\s+/g, ' ').trim()
  const hay = ` ${clean.toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim()} `
  const matched: string[] = []
  const kinds = new Set<TriageKind>()
  const hasPhrase = (phrase: string): boolean => hay.includes(` ${phrase} `)

  if (clean.includes('?') || QUESTION_START.test(clean)) {
    kinds.add('question')
    matched.push('question')
  }
  for (const phrase of OBJECTIONS) {
    if (hasPhrase(phrase)) {
      kinds.add('objection')
      matched.push(phrase)
    }
  }
  for (const phrase of BUYING) {
    if (hasPhrase(phrase)) {
      kinds.add('buying_signal')
      matched.push(phrase)
    }
  }
  const small = clean.toLowerCase()
  if (SMALL_TALK.some((phrase) => small === phrase.trim() || small.startsWith(phrase) || hay.includes(` ${phrase.trim()} `))) {
    if (clean.length < 80) {
      kinds.add('small_talk')
      matched.push('small talk')
    }
  }

  if (kinds.size === 0) {
    return { kind: 'other', confidence: clean.split(' ').length <= 4 ? 0.74 : 0.4, matched }
  }
  if (kinds.size > 1) {
    const kind = kinds.has('objection') ? 'objection' : kinds.has('buying_signal') ? 'buying_signal' : 'question'
    return { kind, confidence: 0.36, matched }
  }
  const kind = [...kinds][0] ?? 'other'
  return { kind, confidence: 0.86, matched }
}

export function parseTriageJson(raw: string): { kind: TriageKind; confidence: number } | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { kind?: unknown; confidence?: unknown }
    if (typeof parsed.kind !== 'string' || !KINDS.includes(parsed.kind as TriageKind)) return null
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : Number.NaN
    if (!Number.isFinite(confidence)) return null
    return { kind: parsed.kind as TriageKind, confidence: Math.max(0, Math.min(1, confidence)) }
  } catch {
    return null
  }
}

export function resolveTriage(
  local: LocalTriage,
  remote: { kind: TriageKind; confidence: number; source?: 'model' | 'offline' } | null,
  ambiguousBelow = 0.62,
): { kind: TriageKind; confidence: number; source: 'local' | 'model' | 'offline' } {
  if (local.confidence >= ambiguousBelow || !remote || remote.source === 'offline' || remote.confidence < 0.45) {
    return { kind: local.kind, confidence: local.confidence, source: 'local' }
  }
  return { kind: remote.kind, confidence: remote.confidence, source: 'model' }
}

export function matchBattlecard(
  cards: Array<{ title: string; text: string; triggers?: string[] }>,
  utterance: string,
): { title: string; excerpt: string } | null {
  const hay = utterance.toLowerCase()
  for (const card of cards) {
    const hit = card.triggers?.find((trigger) => trigger.trim() && hay.includes(trigger.trim().toLowerCase()))
    if (hit) return { title: card.title, excerpt: card.text.replace(/\s+/g, ' ').trim().slice(0, 280) }
  }
  return null
}
