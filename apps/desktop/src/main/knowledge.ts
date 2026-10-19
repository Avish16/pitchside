import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import {
  formatKnowledge,
  htmlToText,
  indexDocuments,
  searchChunks,
  type IndexedChunk,
  type KnowledgeDoc,
  type KnowledgeHit,
  type KnowledgeSource,
} from '@pitchside/shared'

export class KnowledgeStore {
  private docs: KnowledgeDoc[] = []
  private chunks: IndexedChunk[] = []

  constructor(private readonly filePath: string) {
    this.docs = readDocs(filePath)
    this.chunks = indexDocuments(this.docs)
  }

  list(): KnowledgeSource[] {
    return this.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      excerpt: doc.text.replace(/\s+/g, ' ').trim().slice(0, 160),
    }))
  }

  context(): string {
    return formatKnowledge(this.docs)
  }

  search(query: string): KnowledgeHit[] {
    return searchChunks(this.chunks, query)
  }

  add(doc: KnowledgeDoc): KnowledgeSource {
    const next: KnowledgeDoc = {
      id: doc.id,
      title: doc.title.trim() || 'Untitled note',
      kind: doc.kind,
      text: doc.text.trim().slice(0, 40_000),
      triggers: doc.triggers?.map((trigger) => trigger.trim()).filter(Boolean),
    }
    this.docs = [...this.docs.filter((item) => item.id !== next.id), next].slice(-40)
    this.persist()
    return {
      id: next.id,
      title: next.title,
      kind: next.kind,
      excerpt: next.text.slice(0, 160),
    }
  }

  remove(id: string): void {
    this.docs = this.docs.filter((doc) => doc.id !== id)
    this.persist()
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.docs, null, 2))
    this.chunks = indexDocuments(this.docs)
  }
}

function readDocs(filePath: string): KnowledgeDoc[] {
  if (!existsSync(filePath)) return []
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDoc)
  } catch {
    return []
  }
}

function isDoc(value: unknown): value is KnowledgeDoc {
  if (!value || typeof value !== 'object') return false
  const doc = value as KnowledgeDoc
  return (
    typeof doc.id === 'string' &&
    typeof doc.title === 'string' &&
    (doc.kind === 'doc' || doc.kind === 'url' || doc.kind === 'battlecard') &&
    typeof doc.text === 'string'
  )
}

export function readNoteFile(filePath: string): { title: string; text: string } {
  const text = readFileSync(filePath, 'utf8').slice(0, 40_000)
  return { title: basename(filePath).replace(/\.[^.]+$/, ''), text }
}

export async function readUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<{ title: string; text: string }> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https links can be loaded.')
  }
  const response = await fetchImpl(parsed.toString(), { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`The page returned ${response.status}.`)
  const raw = (await response.text()).slice(0, 400_000)
  const extracted = htmlToText(raw)
  if (!extracted.text) throw new Error('That page had no readable text.')
  return { title: extracted.title || parsed.hostname, text: extracted.text.slice(0, 40_000) }
}
