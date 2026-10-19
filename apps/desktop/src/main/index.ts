import { app, BrowserWindow, globalShortcut } from 'electron'
import { clickThroughEnabled, focusAsk, registerIpc, setClickThrough } from './ipc'
import { HOTKEY_ASK, HOTKEY_CLICK_THROUGH, HOTKEY_TOGGLE } from './privacy'
import { createTray } from './tray'
import { createWindows, showOverlay } from './windows'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
  app.disableHardwareAcceleration()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  if (process.platform === 'win32') app.setAppUserModelId('com.pitchside.desktop')

  let quitting = false
  const quit = (): void => {
    quitting = true
    app.quit()
  }

  app.on('second-instance', () => {
    windows?.panel.show()
  })

  let windows: ReturnType<typeof createWindows> | null = null

  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.setActivationPolicy('accessory')
    windows = createWindows()
    registerIpc(windows, quit)
    createTray(windows, quit)

    const toggle = (): void => {
      if (!windows) return
      if (windows.overlay.isVisible()) windows.overlay.hide()
      else showOverlay(windows.overlay)
    }
    const passThrough = (): void => {
      if (!windows) return
      setClickThrough(windows.overlay, !clickThroughEnabled())
    }
    globalShortcut.register(HOTKEY_TOGGLE, toggle)
    globalShortcut.register(HOTKEY_CLICK_THROUGH, passThrough)
    globalShortcut.register(HOTKEY_ASK, () => {
      if (windows) focusAsk(windows)
    })
    app.on('will-quit', () => globalShortcut.unregisterAll())

    for (const window of [windows.overlay, windows.panel]) {
      window.on('close', (event) => {
        if (quitting) return
        event.preventDefault()
        window.hide()
      })
    }

    app.on('activate', () => windows?.panel.show())
    app.on('before-quit', () => {
      quitting = true
    })
    console.info('[pitchside] desktop ready')
  })

  app.on('window-all-closed', () => {
    if (BrowserWindow.getAllWindows().length === 0 && process.platform !== 'darwin') {
      // Windows hide instead of close, so this stays running until Quit.
    }
  })
}
