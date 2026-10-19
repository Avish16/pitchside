import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AnswerEvent,
  AskRequest,
  DesktopSettings,
  PitchsideBridge,
  SharePreview,
  Snapshot,
  TranscriptLine,
} from '@pitchside/shared'
import { Ipc } from '../ipc-channels'

const api: PitchsideBridge = {
  getSnapshot: () => ipcRenderer.invoke(Ipc.getSnapshot),
  refreshHealth: () => ipcRenderer.invoke(Ipc.refreshHealth),
  showOverlay: () => ipcRenderer.invoke(Ipc.showOverlay),
  hideOverlay: () => ipcRenderer.invoke(Ipc.hideOverlay),
  showPanel: () => ipcRenderer.invoke(Ipc.showPanel),
  toggleClickThrough: () => ipcRenderer.invoke(Ipc.toggleClickThrough),
  testShare: () => ipcRenderer.invoke(Ipc.testShare) as Promise<SharePreview>,
  quit: () => ipcRenderer.invoke(Ipc.quit),
  getSettings: () => ipcRenderer.invoke(Ipc.getSettings) as Promise<DesktopSettings>,
  saveSettings: (input) => ipcRenderer.invoke(Ipc.saveSettings, input) as Promise<DesktopSettings>,
  acceptConsent: () => ipcRenderer.invoke(Ipc.acceptConsent) as Promise<DesktopSettings>,
  prepareCall: () => ipcRenderer.invoke(Ipc.prepareCall),
  publishTranscript: (lines) => ipcRenderer.invoke(Ipc.transcriptSync, lines),
  getTranscript: () => ipcRenderer.invoke(Ipc.transcriptGet) as Promise<TranscriptLine[]>,
  ask: (input: AskRequest) => ipcRenderer.invoke(Ipc.ask, input),
  onSnapshot: (listener) => {
    const wrapped = (_event: IpcRendererEvent, snapshot: Snapshot): void => listener(snapshot)
    ipcRenderer.on(Ipc.snapshot, wrapped)
    return () => ipcRenderer.removeListener(Ipc.snapshot, wrapped)
  },
  onAskFocus: (listener) => {
    const wrapped = (): void => listener()
    ipcRenderer.on(Ipc.askFocus, wrapped)
    return () => ipcRenderer.removeListener(Ipc.askFocus, wrapped)
  },
  onDeepAsk: (listener) => {
    const wrapped = (): void => listener()
    ipcRenderer.on(Ipc.deepAsk, wrapped)
    return () => ipcRenderer.removeListener(Ipc.deepAsk, wrapped)
  },
  onAnswer: (listener) => {
    const wrapped = (_event: IpcRendererEvent, payload: AnswerEvent): void => listener(payload)
    ipcRenderer.on(Ipc.answer, wrapped)
    return () => ipcRenderer.removeListener(Ipc.answer, wrapped)
  },
  onTranscript: (listener) => {
    const wrapped = (_event: IpcRendererEvent, lines: TranscriptLine[]): void => listener(lines)
    ipcRenderer.on(Ipc.transcript, wrapped)
    return () => ipcRenderer.removeListener(Ipc.transcript, wrapped)
  },
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('pitchside', api)
} else {
  window.pitchside = api
}
