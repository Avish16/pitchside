import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import {
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
  applyCaptureExclusion,
  overlayPosition,
  overlayWindowOptions,
} from '../overlay/privacy'

export interface OverlayController {
  window: BrowserWindow
  isClickThrough: () => boolean
  setClickThrough: (enabled: boolean) => void
  toggleClickThrough: () => boolean
  toggleVisibility: () => void
  hide: () => void
  show: () => void
  isQuitting: () => boolean
  markQuitting: () => void
}

export function createOverlayController(opaque: boolean): OverlayController {
  let clickThrough = false
  let quitting = false

  const browserWindow = new BrowserWindow(
    overlayWindowOptions(join(__dirname, '../preload/index.js'), opaque),
  )
  const position = overlayPosition(screen.getPrimaryDisplay().workArea, {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
  })
  browserWindow.setPosition(position.x, position.y)
  applyCaptureExclusion(browserWindow)

  browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  browserWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl && url.startsWith(devUrl)) return
    if (url.startsWith('file://')) return
    event.preventDefault()
  })

  browserWindow.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    browserWindow.hide()
  })

  browserWindow.on('show', () => {
    applyCaptureExclusion(browserWindow)
  })

  browserWindow.on('ready-to-show', () => {
    browserWindow.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void browserWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void browserWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const publishClickThrough = (): void => {
    if (browserWindow.isDestroyed()) return
    browserWindow.webContents.send('status', { type: 'click-through', enabled: clickThrough })
  }

  return {
    window: browserWindow,
    isClickThrough: () => clickThrough,
    setClickThrough(enabled: boolean) {
      clickThrough = enabled
      browserWindow.setIgnoreMouseEvents(enabled, { forward: true })
      publishClickThrough()
    },
    toggleClickThrough() {
      this.setClickThrough(!clickThrough)
      return clickThrough
    },
    toggleVisibility() {
      if (browserWindow.isVisible()) browserWindow.hide()
      else this.show()
    },
    hide() {
      browserWindow.hide()
    },
    show() {
      browserWindow.show()
      browserWindow.focus()
      applyCaptureExclusion(browserWindow)
    },
    isQuitting: () => quitting,
    markQuitting() {
      quitting = true
    },
  }
}
