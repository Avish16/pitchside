import { downsampleBuffer, floatTo16BitPCM, uint8ToBase64 } from '../../../audio/pcm'
import { TARGET_SAMPLE_RATE } from '../../../shared/types'
import pcmWorkletUrl from './pcm-worklet.js?url'

export interface CapturedCallAudio {
  mic: MediaStream
  system: MediaStream | null
  systemError?: string
  videoTracks: MediaStreamTrack[]
  stop: () => void
}

const FRAME_SAMPLES = TARGET_SAMPLE_RATE / 10

export async function captureCallAudio(): Promise<CapturedCallAudio> {
  let mic: MediaStream
  try {
    mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
  } catch (error) {
    throw new Error(microphoneError(error))
  }

  let system: MediaStream | null = null
  let systemError: string | undefined
  const videoTracks: MediaStreamTrack[] = []

  try {
    const display = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: { width: 16, height: 16, frameRate: 1 },
    })
    const audioTracks = display.getAudioTracks()
    videoTracks.push(...display.getVideoTracks())
    for (const track of videoTracks) track.enabled = false
    if (audioTracks.length === 0) {
      systemError = 'The capture did not include a system-audio track.'
    } else {
      system = new MediaStream(audioTracks)
    }
  } catch (error) {
    systemError = error instanceof Error ? error.message : 'System audio is not available.'
  }

  return {
    mic,
    system,
    systemError,
    videoTracks,
    stop() {
      for (const track of [...mic.getTracks(), ...(system?.getTracks() ?? []), ...videoTracks]) {
        track.stop()
      }
    },
  }
}

export async function pipeStream(
  stream: MediaStream,
  onAudio: (base64Pcm: string) => void,
): Promise<() => void> {
  const context = new AudioContext()
  await context.resume()
  const source = context.createMediaStreamSource(stream)
  const mute = context.createGain()
  mute.gain.value = 0
  let stopped = false
  const pending: number[] = []

  const consume = (input: Float32Array): void => {
    if (stopped) return
    const downsampled = downsampleBuffer(input, context.sampleRate, TARGET_SAMPLE_RATE)
    for (const sample of downsampled) pending.push(sample)
    while (pending.length >= FRAME_SAMPLES) {
      const frame = new Float32Array(pending.splice(0, FRAME_SAMPLES))
      const pcm = floatTo16BitPCM(frame)
      onAudio(uint8ToBase64(new Uint8Array(pcm.buffer)))
    }
  }

  let worklet: AudioWorkletNode | null = null
  let processor: ScriptProcessorNode | null = null

  try {
    await context.audioWorklet.addModule(pcmWorkletUrl)
    worklet = new AudioWorkletNode(context, 'pcm-processor')
    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => consume(event.data)
    source.connect(worklet)
    worklet.connect(mute)
  } catch {
    processor = context.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => consume(event.inputBuffer.getChannelData(0))
    source.connect(processor)
    processor.connect(mute)
  }
  mute.connect(context.destination)

  return () => {
    stopped = true
    worklet?.disconnect()
    processor?.disconnect()
    source.disconnect()
    mute.disconnect()
    for (const track of stream.getTracks()) track.stop()
    void context.close()
  }
}

function microphoneError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was blocked. Allow the microphone for Call Copilot and try again.'
  }
  if (name === 'NotFoundError') return 'No microphone was found.'
  return error instanceof Error ? error.message : 'Could not open the microphone.'
}
