export const TARGET_SAMPLE_RATE = 16_000

export function rms(input: ArrayLike<number>): number {
  if (input.length === 0) return 0
  let sum = 0
  for (let index = 0; index < input.length; index += 1) {
    const sample = input[index] ?? 0
    sum += sample * sample
  }
  return Math.sqrt(sum / input.length)
}

export function isSpeech(energy: number, threshold = 0.015): boolean {
  return energy >= threshold
}

/** Keeps a few quiet frames after speech so word endings are not clipped. */
export class SpeechGate {
  private hang = 0

  constructor(
    private readonly threshold = 0.015,
    private readonly hangFrames = 3,
  ) {}

  push(energy: number): boolean {
    if (isSpeech(energy, this.threshold)) {
      this.hang = this.hangFrames
      return true
    }
    if (this.hang > 0) {
      this.hang -= 1
      return true
    }
    return false
  }
}

export function downsample(input: ArrayLike<number>, inputRate: number, outputRate = TARGET_SAMPLE_RATE): Float32Array {
  if (input.length === 0) return new Float32Array(0)
  if (inputRate <= outputRate) {
    const same = new Float32Array(input.length)
    for (let index = 0; index < input.length; index += 1) same[index] = input[index] ?? 0
    return same
  }
  const ratio = inputRate / outputRate
  const length = Math.floor(input.length / ratio)
  const out = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(input.length, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let cursor = start; cursor < end; cursor += 1) sum += input[cursor] ?? 0
    out[index] = sum / Math.max(1, end - start)
  }
  return out
}

export function floatToPcm16(input: ArrayLike<number>): Int16Array {
  const out = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0))
    out[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return out
}

/** Channel 0 is the microphone (you). Channel 1 is system audio (the client). */
export function interleaveStereo(mic: Int16Array, system: Int16Array): Int16Array {
  const frames = Math.max(mic.length, system.length)
  const out = new Int16Array(frames * 2)
  for (let index = 0; index < frames; index += 1) {
    out[index * 2] = mic[index] ?? 0
    out[index * 2 + 1] = system[index] ?? 0
  }
  return out
}

export function pcmBytes(pcm: Int16Array): ArrayBuffer {
  const copy = new ArrayBuffer(pcm.byteLength)
  new Uint8Array(copy).set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))
  return copy
}

export function stereoFrame(input: {
  mic: ArrayLike<number>
  system: ArrayLike<number>
  sampleRate: number
  gate: SpeechGate
}): { pcm: Int16Array; audible: boolean } {
  const mic = downsample(input.mic, input.sampleRate)
  const system = downsample(input.system, input.sampleRate)
  const audible = input.gate.push(Math.max(rms(mic), rms(system)))
  return { pcm: interleaveStereo(floatToPcm16(mic), floatToPcm16(system)), audible }
}

export function shouldKeepAlive(lastSpeechAt: number, now: number, intervalMs = 3000): boolean {
  return now - lastSpeechAt >= intervalMs
}
