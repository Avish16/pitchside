import { Menu, Tray, nativeImage, type NativeImage } from 'electron'
import type { OverlayController } from './overlay'

function trayImage(): NativeImage {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - 7.5
      const dy = y - 7.5
      if (dx * dx + dy * dy > 28) continue
      const offset = (y * size + x) * 4
      canvas[offset] = 255
      canvas[offset + 1] = 255
      canvas[offset + 2] = 255
      canvas[offset + 3] = 230
    }
  }
  const image = nativeImage.createFromBitmap(canvas, { width: size, height: size })
  image.setTemplateImage(true)
  return image
}

export function createAppTray(
  overlay: OverlayController,
  actions: { quit: () => void },
): Tray | null {
  try {
    const tray = new Tray(trayImage())
    tray.setToolTip('Call Copilot')
    const refresh = (): void => {
      tray.setContextMenu(
        Menu.buildFromTemplate([
          {
            label: overlay.window.isVisible() ? 'Hide' : 'Show',
            click: () => overlay.toggleVisibility(),
          },
          {
            label: overlay.isClickThrough() ? 'Turn click-through off' : 'Turn click-through on',
            click: () => overlay.toggleClickThrough(),
          },
          { type: 'separator' },
          { label: 'Quit Call Copilot', click: () => actions.quit() },
        ]),
      )
    }
    tray.on('click', () => overlay.show())
    tray.on('right-click', () => refresh())
    refresh()
    return tray
  } catch (error) {
    console.warn('[call-copilot] tray unavailable', error instanceof Error ? error.message : error)
    return null
  }
}
