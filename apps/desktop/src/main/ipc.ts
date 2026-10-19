import { ipcMain, type BrowserWindow } from 'electron'
import type { Snapshot } from '@pitchside/shared'
import { Ipc } from '../ipc-channels'
import { readBackendHealth } from './health'
import type { DesktopWindows } from './windows'

export function registerIpc(
  windows: DesktopWindows,
  quit: () => void,
): { publish: () => Promise<void> } {
  const broadcast = (snapshot: Snapshot): void => {
    for (const window of [windows.overlay, windows.panel]) {
      if (!window.isDestroyed()) window.webContents.send(Ipc.snapshot, snapshot)
    }
  }

  const snapshot = async (): Promise<Snapshot> => ({
    backend: await readBackendHealth(),
    overlayVisible: windows.overlay.isVisible(),
    platform: process.platform,
  })

  const publish = async (): Promise<void> => {
    broadcast(await snapshot())
  }

  ipcMain.handle(Ipc.getSnapshot, () => snapshot())
  ipcMain.handle(Ipc.refreshHealth, () => snapshot())
  ipcMain.handle(Ipc.showOverlay, async () => {
    windows.overlay.show()
    await publish()
  })
  ipcMain.handle(Ipc.hideOverlay, async () => {
    windows.overlay.hide()
    await publish()
  })
  ipcMain.handle(Ipc.showPanel, () => {
    windows.panel.show()
    windows.panel.focus()
  })
  ipcMain.handle(Ipc.quit, () => quit())

  for (const window of [windows.overlay, windows.panel]) {
    window.on('show', () => void publish())
    window.on('hide', () => void publish())
  }

  return { publish }
}

export function isOurWindow(window: BrowserWindow, senderId: number): boolean {
  return window.webContents.id === senderId
}
