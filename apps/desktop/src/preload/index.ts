import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { PitchsideBridge, Snapshot } from '@pitchside/shared'
import { Ipc } from '../ipc-channels'

const api: PitchsideBridge = {
  getSnapshot: () => ipcRenderer.invoke(Ipc.getSnapshot),
  refreshHealth: () => ipcRenderer.invoke(Ipc.refreshHealth),
  showOverlay: () => ipcRenderer.invoke(Ipc.showOverlay),
  hideOverlay: () => ipcRenderer.invoke(Ipc.hideOverlay),
  showPanel: () => ipcRenderer.invoke(Ipc.showPanel),
  quit: () => ipcRenderer.invoke(Ipc.quit),
  onSnapshot: (listener) => {
    const wrapped = (_event: IpcRendererEvent, snapshot: Snapshot): void => listener(snapshot)
    ipcRenderer.on(Ipc.snapshot, wrapped)
    return () => ipcRenderer.removeListener(Ipc.snapshot, wrapped)
  },
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('pitchside', api)
} else {
  window.pitchside = api
}
