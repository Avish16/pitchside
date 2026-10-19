import { Menu, Tray, nativeImage, type NativeImage } from 'electron'
import { clickThroughEnabled, setClickThrough } from './ipc'
import { showOverlay, type DesktopWindows } from './windows'

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
    const refresh = (): void => {
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: 'Show overlay', click: () => showOverlay(windows.overlay) },
          { label: 'Hide overlay', click: () => windows.overlay.hide() },
          {
            label: clickThroughEnabled() ? 'Turn click-through off' : 'Turn click-through on',
            click: () => setClickThrough(windows.overlay, !clickThroughEnabled()),
          },
          { label: 'Open control panel', click: () => windows.panel.show() },
          { type: 'separator' },
          { label: 'Quit Pitchside', click: quit },
        ]),
      )
    }
    refresh()
    tray.on('right-click', refresh)
    tray.on('click', () => windows.panel.show())
    return tray
  } catch (error) {
    console.warn('[pitchside] tray unavailable', error instanceof Error ? error.message : error)
    return null
  }
}
