import { describe, expect, it } from 'vitest'
import {
  chunkText,
  cosine,
  embed,
  formatRetrieved,
  htmlToText,
  indexDocuments,
  isLikelyQuestion,
  searchChunks,
} from './knowledge'

const docs = [
  {
    id: 'price',
    title: 'Seat pricing',
    kind: 'doc' as const,
    text: 'A Pitchside seat is $40 a month for the first ten people. Annual billing is $400 a seat.',
  },
  {
    id: 'london',
    title: 'London rollout',
    kind: 'url' as const,
    text: 'A London team rollout takes three weeks and includes a shared workspace.',
  },
]

describe('knowledge index', () => {
  it('embeds locally and ranks the pricing note above an unrelated one', () => {
    const vector = embed('seat price')
    expect(vector).toHaveLength(256)
    expect(cosine(vector, vector)).toBeCloseTo(1, 5)
    const hits = searchChunks(indexDocuments(docs), 'how much is a seat')
    expect(hits[0]?.title).toBe('Seat pricing')
    expect(hits[0]?.excerpt).toContain('$40')
    expect(formatRetrieved(hits)).toContain('Seat pricing')
  })

  it('chunks long notes and strips html', () => {
    expect(chunkText('a'.repeat(1000))).toHaveLength(3)
    expect(htmlToText('<html><title>Plan</title><style>p{}</style><p>Go live&nbsp;Friday</p></html>')).toEqual({
      title: 'Plan',
      text: 'Go live Friday',
    })
  })

  it('recognizes a client question', () => {
    expect(isLikelyQuestion('what is the seat price')).toBe(true)
    expect(isLikelyQuestion('Sounds good.')).toBe(false)
  })
})
