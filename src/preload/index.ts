import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { CopilotBridge } from '../shared/bridge'
import { IpcChannel, type AudioChunk, type StartSessionRequest } from '../shared/ipc'
import type { SettingsUpdate } from '../shared/types'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

const api: CopilotBridge = {
  getState: () => ipcRenderer.invoke(IpcChannel.getState),
  saveSettings: (input: SettingsUpdate) => ipcRenderer.invoke(IpcChannel.saveSettings, input),
  openExternal: (url: string) => ipcRenderer.invoke(IpcChannel.openExternal, url),
  startSession: (input: StartSessionRequest) => ipcRenderer.invoke(IpcChannel.startSession, input),
  stopSession: () => ipcRenderer.invoke(IpcChannel.stopSession),
  sendAudio: (chunk: AudioChunk) => ipcRenderer.send(IpcChannel.audioChunk, chunk),
  hide: () => {
    void ipcRenderer.invoke(IpcChannel.hide)
  },
  toggleClickThrough: () => ipcRenderer.invoke(IpcChannel.toggleClickThrough),
  quit: () => {
    void ipcRenderer.invoke(IpcChannel.quit)
  },
  onTranscript: (listener) => subscribe(IpcChannel.transcript, listener),
  onSuggestion: (listener) => subscribe(IpcChannel.suggestion, listener),
  onStatus: (listener) => subscribe(IpcChannel.status, listener),
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('copilot', api)
} else {
  window.copilot = api
}
