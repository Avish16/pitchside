import { describe, expect, it } from 'vitest'
import { SpeechGate, floatToPcm16, interleaveStereo, rms, shouldKeepAlive, stereoFrame } from './audio'

describe('local audio', () => {
  it('measures silence as zero and speech above the gate', () => {
    expect(rms(new Float32Array([0, 0, 0]))).toBe(0)
    const gate = new SpeechGate(0.1, 1)
    expect(gate.push(0.01)).toBe(false)
    expect(gate.push(0.4)).toBe(true)
    expect(gate.push(0)).toBe(true)
    expect(gate.push(0)).toBe(false)
  })

  it('puts the microphone on channel 0 and system audio on channel 1', () => {
    const stereo = interleaveStereo(Int16Array.of(1, 2), Int16Array.of(8))
    expect(Array.from(stereo)).toEqual([1, 8, 2, 0])
    const frame = stereoFrame({
      mic: Float32Array.of(0.5, 0.5),
      system: Float32Array.of(0, 0),
      sampleRate: 16_000,
      gate: new SpeechGate(0.01, 0),
    })
    expect(frame.audible).toBe(true)
    expect(frame.pcm[0]).toBeGreaterThan(0)
    expect(frame.pcm[1]).toBe(0)
    expect(floatToPcm16(Float32Array.of(0))[0]).toBe(0)
  })

  it('sends keepalive only after a quiet stretch', () => {
    expect(shouldKeepAlive(1000, 2000)).toBe(false)
    expect(shouldKeepAlive(1000, 4500)).toBe(true)
  })
})
