import { describe, expect, it } from 'vitest'
import { downsampleBuffer, floatTo16BitPCM, PcmChunker } from './pcm'

describe('floatTo16BitPCM', () => {
  it('clamps and scales float samples into signed 16-bit', () => {
    const pcm = floatTo16BitPCM(new Float32Array([0, 1, -1, 2, -2]))
    expect(pcm[0]).toBe(0)
    expect(pcm[1]).toBe(32767)
    expect(pcm[2]).toBe(-32768)
    expect(pcm[3]).toBe(32767)
    expect(pcm[4]).toBe(-32768)
  })
})

describe('downsampleBuffer', () => {
  it('averages samples when reducing the rate by half', () => {
    const output = downsampleBuffer(new Float32Array([1, 1, 3, 3]), 4, 2)
    expect(Array.from(output)).toEqual([1, 3])
  })

  it('returns a copy when the rate does not need to drop', () => {
    const input = new Float32Array([0.25, -0.25])
    const output = downsampleBuffer(input, 16000, 16000)
    expect(Array.from(output)).toEqual([0.25, -0.25])
    expect(output).not.toBe(input)
  })
})

describe('PcmChunker', () => {
  it('emits fixed-size frames and keeps the remainder', () => {
    const frames: number[][] = []
    const chunker = new PcmChunker(4, (frame) => frames.push(Array.from(frame)))
    chunker.push(new Float32Array([1, 2, 3]))
    expect(frames).toHaveLength(0)
    chunker.push(new Float32Array([4, 5]))
    expect(frames).toEqual([
      [1, 2, 3, 4],
    ])
  })
})
