class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.pending = new Float32Array(4096)
    this.count = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true
    let offset = 0
    while (offset < channel.length) {
      const space = this.pending.length - this.count
      const take = Math.min(space, channel.length - offset)
      this.pending.set(channel.subarray(offset, offset + take), this.count)
      this.count += take
      offset += take
      if (this.count === this.pending.length) {
        this.port.postMessage(this.pending.slice(0))
        this.count = 0
      }
    }
    return true
  }
}

registerProcessor('pcm-processor', PcmProcessor)
