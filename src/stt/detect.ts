import type { Speaker, TriggerKind } from '../shared/types'

export interface TriggerDetection {
  kind: TriggerKind
  matched: string
}

const OBJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\btoo expensive\b/i, label: 'too expensive' },
  { pattern: /\bmore expensive\b/i, label: 'more expensive' },
  { pattern: /\bover(?: our)? budget\b/i, label: 'over budget' },
  { pattern: /\bno budget\b/i, label: 'no budget' },
  { pattern: /\bbudget is (?:tight|gone|spent|frozen)\b/i, label: 'tight budget' },
  { pattern: /\btoo (?:pricey|costly)\b/i, label: 'price' },
  { pattern: /\bcosts? too much\b/i, label: 'price' },
  { pattern: /\bcan(?:not|'t) afford\b/i, label: 'affordability' },
  { pattern: /\bcheaper\b/i, label: 'cheaper alternative' },
  { pattern: /\balready (?:have|using|use|got|with)\b/i, label: 'already have a solution' },
  { pattern: /\bcurrent (?:vendor|provider|tool|platform|solution)\b/i, label: 'current vendor' },
  { pattern: /\bnot interested\b/i, label: 'not interested' },
  { pattern: /\bnot the right time\b/i, label: 'timing' },
  { pattern: /\b(?:next quarter|circle back)\b/i, label: 'stall' },
  { pattern: /\bthink about it\b/i, label: 'stall' },
  { pattern: /\bsleep on it\b/i, label: 'stall' },
  {
    pattern: /\btalk to (?:my )?(?:boss|manager|team|ceo|cfo|cto|partner|procurement)\b/i,
    label: 'needs internal buy-in',
  },
  { pattern: /\bneed to (?:check|ask|discuss) (?:with|internally)\b/i, label: 'needs internal buy-in' },
  {
    pattern: /\bsend (?:me )?(?:an email|info|information|a deck|pricing|a proposal)\b/i,
    label: 'send info later',
  },
  { pattern: /\bemail me\b/i, label: 'send info later' },
  { pattern: /\blocked in\b/i, label: 'contract lock-in' },
  { pattern: /\bunder contract\b/i, label: 'contract lock-in' },
  { pattern: /\bnot convinced\b/i, label: 'not convinced' },
  { pattern: /\bdon'?t see the value\b/i, label: 'value' },
  { pattern: /\btoo (?:complicated|complex|risky)\b/i, label: 'risk' },
  { pattern: /\bwe(?:'ll| will) pass\b/i, label: 'pass' },
  { pattern: /\bno thanks\b/i, label: 'pass' },
  { pattern: /\bjust looking\b/i, label: 'just looking' },
  { pattern: /\bnot a priority\b/i, label: 'priority' },
]

const QUESTION_START =
  /^(what|why|how|when|where|who|which|whose|can|could|would|will|do|does|did|is|are|was|were|have|has|should|may|might)\b/i

const QUESTION_PHRASES = [
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bhow do(?:es)?\b/i,
  /\bwhat(?:'s| is) the\b/i,
  /\bwalk me through\b/i,
  /\btell me about\b/i,
  /\bhelp me understand\b/i,
  /\bdo you (?:have|offer|support|integrate)\b/i,
  /\bis there\b/i,
  /\bare there\b/i,
  /\bhow much\b/i,
  /\bhow long\b/i,
]

const SMALL_TALK = new Set([
  'how are you',
  'how are you doing',
  'how is it going',
  'hows it going',
  'what about you',
  'good morning',
  'good afternoon',
  'hello there',
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectTrigger(utterance: string): TriggerDetection | null {
  const text = utterance.replace(/\s+/g, ' ').trim()
  if (text.length < 8) return null
  if (SMALL_TALK.has(normalize(text))) return null

  const words = text.split(' ').filter(Boolean)
  if (words.length < 3 && !text.endsWith('?')) return null

  for (const objection of OBJECTION_PATTERNS) {
    if (objection.pattern.test(text)) {
      return { kind: 'objection', matched: objection.label }
    }
  }

  if (text.endsWith('?') || QUESTION_START.test(text) || QUESTION_PHRASES.some((pattern) => pattern.test(text))) {
    return { kind: 'question', matched: 'question' }
  }

  return null
}

export function decideSuggestion(input: {
  speaker: Speaker
  utterance: string
  lastTrigger: string
}): TriggerDetection | null {
  if (input.speaker !== 'them') return null
  const detection = detectTrigger(input.utterance)
  if (!detection) return null
  const next = input.utterance.trim().toLowerCase()
  if (!next || next === input.lastTrigger.trim().toLowerCase()) return null
  return detection
}
