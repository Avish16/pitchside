import type { BrowserWindowConstructorOptions } from 'electron'

export const HOTKEY_TOGGLE = 'CommandOrControl+Shift+Space'
export const HOTKEY_CLICK_THROUGH = 'CommandOrControl+Shift+C'
export const HOTKEY_ASK = 'CommandOrControl+Shift+A'

export function formatHotkey(accelerator: string, platform: NodeJS.Platform): string {
  const mac = platform === 'darwin'
  return accelerator
    .replace('CommandOrControl', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replace(/\+/g, mac ? '' : '+')
}

export function overlayWindowOptions(
  preloadPath: string,
  platform: NodeJS.Platform,
): BrowserWindowConstructorOptions {
  return {
    width: 400,
    height: 640,
    title: 'Pitchside overlay',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hiddenInMissionControl: true,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    ...(platform === 'darwin' ? { type: 'panel' as const } : {}),
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
  setAlwaysOnTop: (flag: boolean, level?: 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel' | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver') => void
  setVisibleOnAllWorkspaces: (visible: boolean, options?: { visibleOnFullScreen?: boolean }) => void
}

export function applyCaptureExclusion(win: PrivacyWindow): void {
  // Electron maps this to WDA_EXCLUDEFROMCAPTURE on Windows 10 2004+
  // and NSWindow.sharingType = NSWindowSharingNone on macOS.
  // The process stays visible in Activity Monitor and Task Manager.
  win.setContentProtection(true)
  win.setSkipTaskbar(true)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}
