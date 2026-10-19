import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KnowledgeStore, readUrl } from './knowledge'

describe('knowledge store', () => {
  it('keeps raw notes on disk and embeddings only in memory', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'pitchside-kb-')), 'knowledge.json')
    const store = new KnowledgeStore(filePath)
    store.add({
      id: 'price',
      title: 'Seat pricing',
      kind: 'doc',
      text: 'A Pitchside seat is $40 a month for the first ten people.',
    })
    store.add({
      id: 'card',
      title: 'Budget objection',
      kind: 'battlecard',
      text: 'Compare the seat price with the time their team spends rewriting notes.',
      triggers: ['too expensive', 'budget'],
    })
    const reloaded = new KnowledgeStore(filePath)
    const hits = reloaded.search('how much is a seat each month')
    expect(hits[0]?.title).toBe('Seat pricing')
    const saved = readFileSync(filePath, 'utf8')
    expect(saved).not.toContain('vector')
    expect(reloaded.context()).toContain('$40')
  })

  it('reads a page without keeping the fetch client around', async () => {
    const fetchImpl = (async () =>
      new Response('<html><title>Plan</title><p>London takes three weeks.</p></html>', { status: 200 })) as typeof fetch
    const page = await readUrl('https://example.com/plan', fetchImpl)
    expect(page).toEqual({ title: 'Plan', text: 'London takes three weeks.' })
    await expect(readUrl('file:///etc/passwd', fetchImpl)).rejects.toThrow(/http/)
  })
})