export type KnowledgeKind = 'doc' | 'url' | 'battlecard'

export interface KnowledgeDoc {
  id: string
  title: string
  kind: KnowledgeKind
  text: string
  triggers?: string[]
}

export interface IndexedChunk {
  id: string
  sourceId: string
  title: string
  kind: KnowledgeKind
  text: string
  vector: number[]
}

export interface KnowledgeSource {
  id: string
  title: string
  kind: KnowledgeKind
  excerpt: string
}

export interface KnowledgeHit {
  sourceId: string
  title: string
  kind: KnowledgeKind
  excerpt: string
  score: number
}

export interface Citation {
  title: string
  kind: KnowledgeKind
  excerpt: string
}

const DIMS = 256

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? []
}

function hashToken(token: string): number {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function embed(text: string, dims = DIMS): number[] {
  const vector = new Array<number>(dims).fill(0)
  for (const token of tokenize(text)) {
    const hash = hashToken(token)
    const bucket = hash % dims
    vector[bucket] = (vector[bucket] ?? 0) + ((hash & 1) === 0 ? 1 : -1)
  }
  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm) || 1
  return vector.map((value) => value / norm)
}

export function cosine(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  let sum = 0
  for (let index = 0; index < length; index += 1) sum += (left[index] ?? 0) * (right[index] ?? 0)
  return sum
}

export function chunkText(text: string, size = 480, overlap = 60): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]
  const chunks: string[] = []
  let start = 0
  while (start < clean.length && chunks.length < 40) {
    const end = Math.min(clean.length, start + size)
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = Math.max(start + 1, end - overlap)
  }
  return chunks
}

export function indexDocuments(docs: KnowledgeDoc[]): IndexedChunk[] {
  const chunks: IndexedChunk[] = []
  for (const doc of docs) {
    const pieces = chunkText(doc.text)
    pieces.forEach((piece, index) => {
      const triggerText = doc.triggers?.join(' ') ?? ''
      chunks.push({
        id: `${doc.id}:${index}`,
        sourceId: doc.id,
        title: doc.title,
        kind: doc.kind,
        text: piece,
        vector: embed(`${doc.title}\n${triggerText}\n${piece}`),
      })
    })
  }
  return chunks
}

export function searchChunks(chunks: IndexedChunk[], query: string, k = 4): KnowledgeHit[] {
  const queryVector = embed(query)
  return chunks
    .map((chunk) => ({ chunk, score: cosine(queryVector, chunk.vector) }))
    .filter((hit) => hit.score > 0.08)
    .sort((left, right) => right.score - left.score)
    .slice(0, k)
    .map((hit) => ({
      sourceId: hit.chunk.sourceId,
      title: hit.chunk.title,
      kind: hit.chunk.kind,
      excerpt: hit.chunk.text.slice(0, 220),
      score: Number(hit.score.toFixed(4)),
    }))
}

export function formatKnowledge(docs: KnowledgeDoc[], limit = 12_000): string {
  const blocks = docs
    .filter((doc) => doc.text.trim())
    .map((doc) => {
      const triggers = doc.triggers?.length ? `\nTriggers: ${doc.triggers.join(', ')}` : ''
      return `# ${doc.title} (${doc.kind})${triggers}\n${doc.text.trim()}`
    })
  const joined = blocks.join('\n\n')
  return joined.length > limit ? joined.slice(0, limit) : joined
}

export function formatRetrieved(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return ''
  return hits.map((hit) => `[${hit.title}] ${hit.excerpt}`).join('\n')
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<title[\s\S]*?<\/title>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim()
  return { title: title.trim(), text }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

const QUESTION_START = /^(what|how|why|when|where|who|which|can|could|do|does|did|is|are|will|would|should)\b/i

export function isLikelyQuestion(text: string): boolean {
  const clean = text.trim()
  if (!clean) return false
  if (clean.includes('?')) return true
  return QUESTION_START.test(clean)
}
