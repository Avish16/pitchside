import { TARGET_SAMPLE_RATE } from '../shared/types'

export { TARGET_SAMPLE_RATE }

export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0))
    output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff)
  }
  return output
}

export function downsampleBuffer(
  input: Float32Array,
  inputRate: number,
  outputRate: number = TARGET_SAMPLE_RATE,
): Float32Array {
  if (outputRate <= 0 || inputRate <= 0) return new Float32Array()
  if (outputRate >= inputRate) return input.slice()

  const ratio = inputRate / outputRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(input.length, Math.floor((index + 1) * ratio))
    let sum = 0
    let count = 0
    for (let cursor = start; cursor < end; cursor += 1) {
      sum += input[cursor] ?? 0
      count += 1
    }
    output[index] = count > 0 ? sum / count : 0
  }
  return output
}

export class PcmChunker {
  private readonly pending: Float32Array
  private length = 0

  constructor(
    private readonly frameSize: number,
    private readonly onFrame: (frame: Float32Array) => void,
  ) {
    this.pending = new Float32Array(Math.max(frameSize * 4, frameSize))
  }

  push(samples: Float32Array): void {
    if (this.frameSize <= 0) return
    let offset = 0
    while (offset < samples.length) {
      const space = this.pending.length - this.length
      const take = Math.min(space, samples.length - offset)
      if (take <= 0) {
        this.drain()
        if (this.length >= this.pending.length) this.length = 0
        continue
      }
      this.pending.set(samples.subarray(offset, offset + take), this.length)
      this.length += take
      offset += take
      this.drain()
    }
  }

  private drain(): void {
    while (this.length >= this.frameSize) {
      const frame = this.pending.slice(0, this.frameSize)
      this.pending.copyWithin(0, this.frameSize, this.length)
      this.length -= this.frameSize
      this.onFrame(frame)
    }
  }
}

export function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let binary = ''
    const stride = 0x8000
    for (let index = 0; index < bytes.length; index += stride) {
      const slice = bytes.subarray(index, index + stride)
      binary += String.fromCharCode(...slice)
    }
    return globalThis.btoa(binary)
  }
  return Buffer.from(bytes).toString('base64')
}
