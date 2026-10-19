import WebSocket from 'ws'
import { TARGET_SAMPLE_RATE } from '../shared/types'
import { deepgramListenUrl, parseDeepgramMessage, type DeepgramEvent } from './deepgram-parse'

export interface StreamingTranscriber {
  connect: () => Promise<void>
  sendAudio: (pcm: Buffer) => void
  close: () => void
}

export interface DeepgramHandlers {
  onEvent: (event: DeepgramEvent) => void
  onError: (error: Error) => void
}

function rawDataToString(data: WebSocket.RawData): string {
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  return data.toString('utf8')
}

export class DeepgramLiveClient implements StreamingTranscriber {
  private socket: WebSocket | null = null
  private keepAlive: NodeJS.Timeout | null = null
  private opened = false
  private readonly queued: Buffer[] = []

  constructor(
    private readonly apiKey: string,
    private readonly handlers: DeepgramHandlers,
    private readonly sampleRate = TARGET_SAMPLE_RATE,
  ) {}

  connect(): Promise<void> {
    const url = deepgramListenUrl(this.sampleRate)
    return new Promise<void>((resolve, reject) => {
      let settled = false
      const resolveOnce = (): void => {
        if (settled) return
        settled = true
        resolve()
      }
      const rejectOnce = (error: Error): void => {
        if (settled) {
          this.handlers.onError(error)
          return
        }
        settled = true
        reject(error)
      }

      const socket = new WebSocket(url, {
        headers: { Authorization: `Token ${this.apiKey}` },
      })
      this.socket = socket

      socket.on('open', () => {
        this.opened = true
        this.keepAlive = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        }, 4000)
        this.keepAlive.unref?.()
        const queued = this.queued.splice(0)
        for (const chunk of queued) socket.send(chunk)
        resolveOnce()
      })

      socket.on('message', (data) => {
        const parsed = parseDeepgramMessage(rawDataToString(data))
        if (parsed.kind === 'error') {
          this.handlers.onError(new Error(parsed.message))
          return
        }
        if (parsed.kind !== 'ignore') this.handlers.onEvent(parsed)
      })

      socket.on('error', (error) => {
        rejectOnce(error instanceof Error ? error : new Error(String(error)))
      })

      socket.on('unexpected-response', (_request, response) => {
        rejectOnce(new Error(`Deepgram rejected the connection (${response.statusCode ?? 'unknown'})`))
      })

      socket.on('close', () => {
        this.clearKeepAlive()
        if (!this.opened) rejectOnce(new Error('Deepgram connection closed before it opened'))
      })
    })
  }

  sendAudio(pcm: Buffer): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(pcm)
      return
    }
    if (this.queued.length < 40) this.queued.push(pcm)
  }

  close(): void {
    this.clearKeepAlive()
    const socket = this.socket
    this.socket = null
    if (!socket) return
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'CloseStream' }))
    }
    socket.close()
  }

  private clearKeepAlive(): void {
    if (!this.keepAlive) return
    clearInterval(this.keepAlive)
    this.keepAlive = null
  }
}
