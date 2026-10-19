import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

export interface DesktopWindows {
  overlay: BrowserWindow
  panel: BrowserWindow
}

function pageUrl(page: 'overlay.html' | 'panel.html'): string {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) return `${devUrl}/${page}`
  return join(__dirname, '../renderer', page)
}

function load(window: BrowserWindow, page: 'overlay.html' | 'panel.html'): void {
  const target = pageUrl(page)
  if (target.startsWith('http')) void window.loadURL(target)
  else void window.loadFile(target)
}

export function createWindows(): DesktopWindows {
  const preload = join(__dirname, '../preload/index.js')
  const workArea = screen.getPrimaryDisplay().workArea

  const overlay = new BrowserWindow({
    width: 400,
    height: 640,
    x: workArea.x + workArea.width - 416,
    y: workArea.y + 24,
    title: 'Pitchside overlay',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const panel = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 760,
    minHeight: 560,
    x: workArea.x + 48,
    y: workArea.y + 48,
    title: 'Pitchside',
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#14120e',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  for (const window of [overlay, panel]) {
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event, url) => {
      const devUrl = process.env.ELECTRON_RENDERER_URL
      if (devUrl && url.startsWith(devUrl)) return
      if (url.startsWith('file://')) return
      event.preventDefault()
    })
  }

  overlay.on('ready-to-show', () => overlay.show())
  panel.on('ready-to-show', () => panel.show())
  load(overlay, 'overlay.html')
  load(panel, 'panel.html')
  return { overlay, panel }
}
