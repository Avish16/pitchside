import { desktopCapturer, session } from 'electron'

const MEDIA_PERMISSIONS = new Set(['media', 'display-capture', 'mediaKeySystem', 'audioCapture', 'videoCapture'])

/** macOS loopback is ScreenCaptureKit. Windows loopback is WASAPI. Linux may not provide either. */
export function installCaptureHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(MEDIA_PERMISSIONS.has(permission))
  })
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
      .catch(() => callback({}))
  })
}
