import type { BrowserWindowConstructorOptions } from 'electron'

export const HOTKEY_TOGGLE_WINDOW = 'CommandOrControl+Shift+Space'
export const HOTKEY_CLICK_THROUGH = 'CommandOrControl+Shift+C'

export const OVERLAY_WIDTH = 420
export const OVERLAY_HEIGHT = 720

export function formatHotkey(accelerator: string, platform: NodeJS.Platform): string {
  const mac = platform === 'darwin'
  return accelerator
    .replace('CommandOrControl', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replace(/\+/g, mac ? '' : '+')
}

export function overlayPosition(
  workArea: { x: number; y: number; width: number; height: number },
  windowSize: { width: number; height: number },
): { x: number; y: number } {
  const margin = 16
  return {
    x: Math.round(workArea.x + workArea.width - windowSize.width - margin),
    y: Math.round(workArea.y + margin),
  }
}

export function overlayWindowOptions(
  preloadPath: string,
  opaque: boolean,
): BrowserWindowConstructorOptions {
  return {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    minWidth: 320,
    minHeight: 520,
    title: 'Call Copilot',
    frame: false,
    transparent: !opaque,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: opaque ? '#10141b' : '#00000000',
    roundedCorners: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }
}

export interface PrivacyWindow {
  setContentProtection: (enabled: boolean) => void
  setSkipTaskbar: (skip: boolean) => void
  setAlwaysOnTop: (flag: boolean, level?: 'normal' | 'floating' | 'screen-saver') => void
  setVisibleOnAllWorkspaces: (visible: boolean, options?: { visibleOnFullScreen?: boolean }) => void
}

export function applyCaptureExclusion(win: PrivacyWindow): void {
  // Electron maps this to SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  // on Windows 10 2004+ and to NSWindow.sharingType = NSWindowSharingNone
  // on macOS. The window stays on the local display and is omitted from
  // screen-capture APIs used by Zoom, Teams, Meet, and OBS. Linux ignores it.
  win.setContentProtection(true)
  win.setSkipTaskbar(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}
