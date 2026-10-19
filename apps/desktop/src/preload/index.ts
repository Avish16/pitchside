import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { PitchsideBridge, SharePreview, Snapshot } from '@pitchside/shared'
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
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('pitchside', api)
} else {
  window.pitchside = api
}
