import { app, desktopCapturer, globalShortcut, session } from 'electron'
import { join } from 'path'
import {
  HOTKEY_CLICK_THROUGH,
  HOTKEY_TOGGLE_WINDOW,
} from '../overlay/privacy'
import { loadEnvFile } from '../settings/env'
import { registerIpc } from './ipc'
import { createOverlayController } from './overlay'
import { createAppTray } from './tray'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
  app.disableHardwareAcceleration()
}

loadEnvFile(join(process.cwd(), '.env'))

const opaque = process.env.CALL_COPILOT_OPAQUE === '1'
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  if (process.platform === 'win32') app.setAppUserModelId('com.callcopilot.app')

  app.on('second-instance', () => {
    overlay?.show()
  })

  let overlay: ReturnType<typeof createOverlayController> | null = null

  const quit = (): void => {
    overlay?.markQuitting()
    app.quit()
  }

  app.whenReady().then(() => {
    registerCapturePermissions()
    overlay = createOverlayController(opaque)
    const runtime = registerIpc(overlay, opaque)
    createAppTray(overlay, { quit })

    const toggleRegistered = globalShortcut.register(HOTKEY_TOGGLE_WINDOW, () => overlay?.toggleVisibility())
    const clickRegistered = globalShortcut.register(HOTKEY_CLICK_THROUGH, () => overlay?.toggleClickThrough())
    if (!toggleRegistered || !clickRegistered) {
      console.warn('[call-copilot] a global hotkey was already taken')
    }

    if (process.env.ELECTRON_RENDERER_URL) {
      globalShortcut.register('CommandOrControl+Shift+I', () => {
        overlay?.window.webContents.openDevTools({ mode: 'detach' })
      })
    }

    app.on('activate', () => overlay?.show())
    app.on('before-quit', () => {
      overlay?.markQuitting()
      runtime.session.stop()
    })
    app.on('will-quit', () => {
      globalShortcut.unregisterAll()
    })

    console.info(
      `[call-copilot] overlay ready. ${HOTKEY_TOGGLE_WINDOW} shows or hides it. ${HOTKEY_CLICK_THROUGH} toggles click-through.`,
    )
  })

  app.on('window-all-closed', () => {
    // The overlay hides instead of closing. Quit from the tray or Settings.
  })
}

function registerCapturePermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'display-capture' || permission === 'mediaKeySystem')
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media' || permission === 'display-capture' || permission === 'mediaKeySystem'
  })

  // Windows loopback comes from desktopCapturer as audio: 'loopback'.
  // The video source is required by the capture API and is not uploaded.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => {
        const source = sources[0]
        if (!source) {
          callback({})
          return
        }
        callback({ video: source, audio: 'loopback' })
      })
      .catch(() => {
        callback({})
      })
  })
}
