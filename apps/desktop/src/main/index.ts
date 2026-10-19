import { app, BrowserWindow } from 'electron'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { createWindows } from './windows'

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
    windows = createWindows()
    registerIpc(windows, quit)
    createTray(windows, quit)

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
