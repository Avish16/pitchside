import { ipcMain, desktopCapturer, type BrowserWindow } from 'electron'
import type { SharePreview, Snapshot } from '@pitchside/shared'
import { Ipc } from '../ipc-channels'
import { readBackendHealth } from './health'
import { HOTKEY_ASK, HOTKEY_CLICK_THROUGH, HOTKEY_TOGGLE, formatHotkey } from './privacy'
import { showOverlay, type DesktopWindows } from './windows'

let clickThrough = false
let afterClickThrough: () => void = () => undefined

export function clickThroughEnabled(): boolean {
  return clickThrough
}

export function setClickThrough(overlay: BrowserWindow, enabled: boolean): boolean {
  clickThrough = enabled
  overlay.setIgnoreMouseEvents(enabled, { forward: true })
  afterClickThrough()
  return clickThrough
}

async function sharePreview(): Promise<SharePreview> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 960, height: 540 },
    })
    const source = sources[0]
    if (!source || source.thumbnail.isEmpty()) {
      return { image: '', note: 'No screen preview was available. A display is required.' }
    }
    return {
      image: source.thumbnail.toDataURL(),
      note: 'This is a live full-screen capture. On Windows and macOS the Pitchside overlay should be missing from it. Linux often ignores capture exclusion, so the overlay may still appear here.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Screen preview failed'
    return { image: '', note: message }
  }
}

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
    clickThrough,
    platform: process.platform,
    hotkeys: {
      toggle: formatHotkey(HOTKEY_TOGGLE, process.platform),
      clickThrough: formatHotkey(HOTKEY_CLICK_THROUGH, process.platform),
      ask: formatHotkey(HOTKEY_ASK, process.platform),
    },
  })

  const publish = async (): Promise<void> => {
    broadcast(await snapshot())
  }
  afterClickThrough = () => {
    void publish()
  }

  ipcMain.handle(Ipc.getSnapshot, () => snapshot())
  ipcMain.handle(Ipc.refreshHealth, () => snapshot())
  ipcMain.handle(Ipc.showOverlay, async () => {
    showOverlay(windows.overlay)
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
  ipcMain.handle(Ipc.toggleClickThrough, async () => {
    const enabled = setClickThrough(windows.overlay, !clickThrough)
    await publish()
    return enabled
  })
  ipcMain.handle(Ipc.testShare, () => sharePreview())
  ipcMain.handle(Ipc.quit, () => quit())

  for (const window of [windows.overlay, windows.panel]) {
    window.on('show', () => void publish())
    window.on('hide', () => void publish())
  }

  return { publish }
}

export function focusAsk(windows: DesktopWindows): void {
  windows.panel.show()
  windows.panel.focus()
  windows.panel.webContents.send(Ipc.askFocus)
}
