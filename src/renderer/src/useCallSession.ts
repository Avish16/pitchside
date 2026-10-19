import { useEffect, useRef, useState } from 'react'
import type { Speaker } from '../../shared/types'
import type { SuggestionCard } from './components/SuggestionsPane'
import type { TranscriptLine } from './components/TranscriptPane'
import { captureCallAudio, pipeStream } from './audio/capture'

interface UseCallSessionOptions {
  micFallback: boolean
}

export function useCallSession({ micFallback }: UseCallSessionOptions) {
  const bridge = window.copilot
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [interims, setInterims] = useState<Partial<Record<Speaker, string>>>({})
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([])
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemAudio, setSystemAudio] = useState<boolean | null>(null)
  const [systemAudioReason, setSystemAudioReason] = useState<string | null>(null)
  const [clickThrough, setClickThrough] = useState(false)
  const stopCapture = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!bridge) return
    const offTranscript = bridge.onTranscript((event) => {
      if (event.type === 'interim') {
        setInterims((current) => ({ ...current, [event.speaker]: event.text }))
        return
      }
      setInterims((current) => ({ ...current, [event.speaker]: '' }))
      setLines((current) => [...current, { id: event.id, speaker: event.speaker, text: event.text }].slice(-200))
    })
    const offSuggestion = bridge.onSuggestion((event) => {
      setSuggestions((current) => {
        if (event.type === 'start') {
          const next: SuggestionCard = {
            id: event.id,
            kind: event.kind,
            triggerText: event.triggerText,
            content: '',
            status: 'streaming',
          }
          return [
            next,
            ...current.map((card) => (card.status === 'streaming' ? { ...card, status: 'done' as const } : card)),
          ].slice(0, 8)
        }
        return current.map((card) => {
          if (card.id !== event.id) return card
          if (event.type === 'delta') return { ...card, content: card.content + event.text }
          if (event.type === 'done') return { ...card, status: 'done' as const }
          return { ...card, status: 'error' as const, error: event.message }
        })
      })
    })
    const offStatus = bridge.onStatus((event) => {
      if (event.type === 'click-through') setClickThrough(event.enabled)
      if (event.type === 'error') setError(event.message)
      if (event.type === 'session' && event.state === 'idle') setLive(false)
    })
    return () => {
      offTranscript()
      offSuggestion()
      offStatus()
    }
  }, [bridge])

  useEffect(() => {
    return () => {
      stopCapture.current?.()
    }
  }, [])

  async function start(): Promise<void> {
    if (!bridge || live || busy) return
    setBusy(true)
    setError(null)
    try {
      const captured = await captureCallAudio()
      const micSpeaker: Speaker = captured.system ? 'you' : micFallback ? 'them' : 'you'
      const channels: Speaker[] = captured.system ? ['you', 'them'] : [micSpeaker]
      const result = await bridge.startSession({ channels })
      if (!result.ok) {
        captured.stop()
        setSystemAudio(Boolean(captured.system))
        setSystemAudioReason(captured.systemError ?? null)
        setError(result.error)
        return
      }

      const stopMic = await pipeStream(captured.mic, (audio) => {
        bridge.sendAudio({ speaker: micSpeaker, audio })
      })
      const stopSystem = captured.system
        ? await pipeStream(captured.system, (audio) => {
            bridge.sendAudio({ speaker: 'them', audio })
          })
        : null

      stopCapture.current = () => {
        stopMic()
        stopSystem?.()
        captured.stop()
      }
      setSystemAudio(Boolean(captured.system))
      setSystemAudioReason(captured.system ? null : captured.systemError ?? 'System audio is not available.')
      setLines([])
      setInterims({})
      setSuggestions([])
      setLive(true)
    } catch (caught) {
      await bridge.stopSession().catch(() => undefined)
      setError(caught instanceof Error ? caught.message : 'Could not start listening')
    } finally {
      setBusy(false)
    }
  }

  async function stop(): Promise<void> {
    if (!bridge) return
    setBusy(true)
    stopCapture.current?.()
    stopCapture.current = null
    await bridge.stopSession().catch(() => undefined)
    setLive(false)
    setBusy(false)
  }

  return {
    lines,
    interims,
    suggestions,
    live,
    busy,
    error,
    setError,
    systemAudio,
    systemAudioReason,
    clickThrough,
    setClickThrough,
    start,
    stop,
    clearTranscript: () => {
      setLines([])
      setInterims({})
    },
  }
}
