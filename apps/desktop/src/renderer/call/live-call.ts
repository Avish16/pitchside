import {
  SpeechGate,
  deepgramProtocols,
  parseDeepgramMessage,
  pcmBytes,
  shouldKeepAlive,
  stereoFrame,
  type TranscriptEvent,
} from '@pitchside/shared'

export interface CaptureStatus {
  mic: string
  system: string
  socket: string
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The screen-audio request timed out.')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error('Audio request failed'))
      },
    )
  })
}

export async function startLiveCall(options: {
  accessToken: string
  listenUrl: string
  onEvent: (event: TranscriptEvent) => void
  onStatus: (status: CaptureStatus) => void
}): Promise<{ stop: () => void }> {
  const status: CaptureStatus = {
    mic: 'Requesting the microphone…',
    system: 'Requesting system audio…',
    socket: 'Waiting for audio…',
  }
  const publish = (): void => options.onStatus({ ...status })
  publish()

  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  })
  status.mic = 'Microphone is connected.'
  publish()

  let display: MediaStream | null = null
  try {
    display = await withTimeout(navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }), 8000)
    for (const track of display.getVideoTracks()) track.enabled = false
    if (display.getAudioTracks().length === 0) {
      for (const track of display.getTracks()) track.stop()
      display = null
      status.system = 'System audio did not start. Client lines can be practiced by typing them.'
    } else {
      status.system = 'System audio is a separate stream.'
    }
  } catch {
    display = null
    status.system = 'System audio is unavailable here. Client lines can be practiced by typing them.'
  }
  publish()

  const socket = new WebSocket(options.listenUrl, deepgramProtocols(options.accessToken))
  status.socket = 'Opening one transcription connection…'
  publish()

  const ctx = new AudioContext()
  const gate = new SpeechGate()
  let systemSamples: ArrayLike<number> = new Float32Array(0)
  let lastSpeechAt = Date.now()
  let lastKeepaliveAt = 0
  const releases: Array<() => void> = []
  let stopped = false

  const tap = (stream: MediaStream, onSamples: (samples: ArrayLike<number>) => void): void => {
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    const mute = ctx.createGain()
    mute.gain.value = 0
    source.connect(processor)
    processor.connect(mute)
    mute.connect(ctx.destination)
    processor.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0)
    const copy = new Float32Array(channel.length)
    copy.set(channel)
    onSamples(copy)
    }
    releases.push(() => {
      processor.onaudioprocess = null
      processor.disconnect()
      source.disconnect()
      mute.disconnect()
    })
  }

  socket.addEventListener('open', () => {
    status.socket = 'One transcription connection is open.'
    publish()
  })
  socket.addEventListener('message', (message) => {
    void readSocketData(message.data).then((raw) => {
      if (!raw) return
      const parsed = parseDeepgramMessage(raw)
      if (parsed.type === 'transcript') options.onEvent(parsed.event)
      if (parsed.type === 'error') {
        status.socket = parsed.message
        publish()
      }
    })
  })
  socket.addEventListener('error', () => {
    status.socket = 'The transcription connection failed. Practice lines still stay on this computer.'
    publish()
  })

  if (display) tap(new MediaStream(display.getAudioTracks()), (samples) => {
    systemSamples = samples
  })
  tap(mic, (samples) => {
    if (socket.readyState !== WebSocket.OPEN) return
    const frame = stereoFrame({
      mic: samples,
      system: systemSamples.length > 0 ? systemSamples : new Float32Array(samples.length),
      sampleRate: ctx.sampleRate,
      gate,
    })
    if (!frame.audible) return
    lastSpeechAt = Date.now()
    socket.send(pcmBytes(frame.pcm))
  })

  const keepalive = setInterval(() => {
    const now = Date.now()
    if (socket.readyState !== WebSocket.OPEN) return
    if (!shouldKeepAlive(lastSpeechAt, now) || now - lastKeepaliveAt < 3000) return
    lastKeepaliveAt = now
    socket.send(JSON.stringify({ type: 'KeepAlive' }))
  }, 1000)

  const stop = (): void => {
    if (stopped) return
    stopped = true
    clearInterval(keepalive)
    for (const release of releases) release()
    void ctx.close()
    for (const track of mic.getTracks()) track.stop()
    if (display) for (const track of display.getTracks()) track.stop()
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'CloseStream' }))
    socket.close()
    status.socket = 'Listening stopped.'
    publish()
  }

  return { stop }
}

async function readSocketData(data: unknown): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return data.text()
  return ''
}
