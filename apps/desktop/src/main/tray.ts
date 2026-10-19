import { Menu, Tray, nativeImage, type NativeImage } from 'electron'
import type { DesktopWindows } from './windows'

function trayImage(): NativeImage {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - 7.5
      const dy = y - 7.5
      if (dx * dx + dy * dy > 26) continue
      const offset = (y * size + x) * 4
      canvas[offset] = 90
      canvas[offset + 1] = 161
      canvas[offset + 2] = 231
      canvas[offset + 3] = 255
    }
  }
  const image = nativeImage.createFromBitmap(canvas, { width: size, height: size })
  image.setTemplateImage(true)
  return image
}

export function createTray(windows: DesktopWindows, quit: () => void): Tray | null {
  try {
    const tray = new Tray(trayImage())
    tray.setToolTip('Pitchside')
    const menu = (): Menu =>
      Menu.buildFromTemplate([
        { label: 'Show overlay', click: () => windows.overlay.show() },
        { label: 'Hide overlay', click: () => windows.overlay.hide() },
        { label: 'Open control panel', click: () => windows.panel.show() },
        { type: 'separator' },
        { label: 'Quit Pitchside', click: quit },
      ])
    tray.setContextMenu(menu())
    tray.on('click', () => windows.panel.show())
    return tray
  } catch (error) {
    console.warn('[pitchside] tray unavailable', error instanceof Error ? error.message : error)
    return null
  }
}
