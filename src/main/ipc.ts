import { app, ipcMain, shell } from 'electron'
import { streamChat } from '../llm/openrouter'
import { IpcChannel, isSpeaker, type AudioChunk, type StartSessionRequest } from '../shared/ipc'
import { isAllowedExternalUrl } from '../shared/links'
import type { AppState } from '../shared/types'
import { redactSecrets } from '../shared/redact'
import { DeepgramLiveClient } from '../stt/deepgram'
import { getPublicSettings, getSecretSettings, updateSettings } from '../settings/store'
import { HOTKEY_CLICK_THROUGH, HOTKEY_TOGGLE_WINDOW, formatHotkey } from '../overlay/privacy'
import type { OverlayController } from './overlay'
import { createCallSession, type CallSession } from './session'

export interface IpcRuntime {
  session: CallSession
  broadcastError: (message: string) => void
}

export function registerIpc(overlay: OverlayController, opaque: boolean): IpcRuntime {
  const sendError = (message: string): void => {
    if (overlay.window.isDestroyed()) return
    overlay.window.webContents.send(IpcChannel.status, { type: 'error', message })
  }

  const session = createCallSession({
    createTranscriber: (_speaker, handlers) => {
      const settings = getSecretSettings()
      return new DeepgramLiveClient(settings.deepgramApiKey, handlers)
    },
    complete: async (request) => {
      const settings = getSecretSettings()
      await streamChat({ ...request, apiKey: settings.openrouterApiKey })
    },
    loadSettings: () => {
      const settings = getSecretSettings()
      return {
        model: settings.model,
        contextDoc: settings.contextDoc,
        openrouterApiKey: settings.openrouterApiKey,
      }
    },
    onTranscript: (event) => {
      if (!overlay.window.isDestroyed()) overlay.window.webContents.send(IpcChannel.transcript, event)
    },
    onSuggestion: (event) => {
      if (!overlay.window.isDestroyed()) overlay.window.webContents.send(IpcChannel.suggestion, event)
    },
    onError: (message) => {
      const settings = getSecretSettings()
      sendError(redactSecrets(message, [settings.deepgramApiKey, settings.openrouterApiKey]))
    },
  })

  const state = (): AppState => ({
    settings: getPublicSettings(),
    platform: process.platform,
    clickThrough: overlay.isClickThrough(),
    hotkeys: {
      toggle: formatHotkey(HOTKEY_TOGGLE_WINDOW, process.platform),
      clickThrough: formatHotkey(HOTKEY_CLICK_THROUGH, process.platform),
    },
    opaque,
  })

  ipcMain.handle(IpcChannel.getState, () => state())

  ipcMain.handle(IpcChannel.saveSettings, (_event, input: unknown) => {
    if (!input || typeof input !== 'object') return { ok: false, error: 'Settings were empty.' }
    return updateSettings(input as Parameters<typeof updateSettings>[0])
  })

  ipcMain.handle(IpcChannel.openExternal, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !isAllowedExternalUrl(url)) return false
    await shell.openExternal(url)
    return true
  })

  ipcMain.handle(IpcChannel.startSession, async (_event, input: StartSessionRequest) => {
    const channels = Array.isArray(input?.channels) ? input.channels.filter(isSpeaker) : []
    if (channels.length === 0) return { ok: false, error: 'No audio channel was selected.' }
    const secrets = getSecretSettings()
    if (!secrets.deepgramApiKey || !secrets.openrouterApiKey) {
      return { ok: false, error: 'Add a Deepgram key and an OpenRouter key in Settings.' }
    }
    try {
      await session.start(channels)
      overlay.window.webContents.send(IpcChannel.status, { type: 'session', state: 'live' })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start transcription'
      return { ok: false, error: redactSecrets(message, [secrets.deepgramApiKey, secrets.openrouterApiKey]) }
    }
  })

  ipcMain.handle(IpcChannel.stopSession, async () => {
    session.stop()
    if (!overlay.window.isDestroyed()) {
      overlay.window.webContents.send(IpcChannel.status, { type: 'session', state: 'idle' })
    }
  })

  ipcMain.on(IpcChannel.audioChunk, (event, payload: AudioChunk) => {
    if (event.sender !== overlay.window.webContents) return
    if (!payload || !isSpeaker(payload.speaker) || typeof payload.audio !== 'string') return
    if (payload.audio.length === 0 || payload.audio.length > 200_000) return
    session.sendAudio(payload.speaker, Buffer.from(payload.audio, 'base64'))
  })

  ipcMain.handle(IpcChannel.hide, () => overlay.hide())
  ipcMain.handle(IpcChannel.toggleClickThrough, () => overlay.toggleClickThrough())
  ipcMain.handle(IpcChannel.quit, () => {
    overlay.markQuitting()
    app.quit()
  })

  return { session, broadcastError: sendError }
}
