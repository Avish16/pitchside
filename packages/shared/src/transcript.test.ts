import { describe, expect, it } from 'vitest'
import { reduceTranscript, speakerLabel } from './transcript'

describe('transcript', () => {
  it('replaces a partial with the final line for that speaker', () => {
    let id = 0
    const next = () => String(++id)
    let lines = reduceTranscript([], { type: 'partial', speaker: 'you', text: 'hel' }, next)
    lines = reduceTranscript(lines, { type: 'partial', speaker: 'client', text: 'what is' }, next)
    lines = reduceTranscript(lines, { type: 'final', speaker: 'you', text: 'hello there' }, next)
    lines = reduceTranscript(lines, { type: 'final', speaker: 'client', text: 'what is the price?' }, next)
    expect(lines.map((line) => `${speakerLabel(line.speaker)}:${line.final}:${line.text}`)).toEqual([
      'You:true:hello there',
      'Client:true:what is the price?',
    ])
  })

  it('ignores blank updates', () => {
    expect(reduceTranscript([], { type: 'final', speaker: 'client', text: '   ' }, () => '1')).toEqual([])
  })
})
