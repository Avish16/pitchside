import { describe, expect, it } from 'vitest'
import {
  HOTKEY_CLICK_THROUGH,
  HOTKEY_TOGGLE_WINDOW,
  applyCaptureExclusion,
  formatHotkey,
  overlayPosition,
  overlayWindowOptions,
  type PrivacyWindow,
} from './privacy'

describe('overlay window', () => {
  it('is a frameless, always-on-top overlay that skips the taskbar', () => {
    const options = overlayWindowOptions('/tmp/preload.js', false)
    expect(options.frame).toBe(false)
    expect(options.transparent).toBe(true)
    expect(options.alwaysOnTop).toBe(true)
    expect(options.skipTaskbar).toBe(true)
    expect(options.webPreferences?.contextIsolation).toBe(true)
    expect(options.webPreferences?.nodeIntegration).toBe(false)
    expect(options.webPreferences?.sandbox).toBe(true)
  })

  it('can fall back to an opaque window when compositing is unavailable', () => {
    const options = overlayWindowOptions('/tmp/preload.js', true)
    expect(options.transparent).toBe(false)
    expect(options.backgroundColor).toBe('#10141b')
  })

  it('asks the OS to exclude the window from screen capture', () => {
    const calls: string[] = []
    const win: PrivacyWindow = {
      setContentProtection: (enabled) => calls.push(`protect:${enabled}`),
      setSkipTaskbar: (skip) => calls.push(`taskbar:${skip}`),
      setAlwaysOnTop: (flag, level) => calls.push(`top:${flag}:${level ?? ''}`),
      setVisibleOnAllWorkspaces: (visible) => calls.push(`spaces:${visible}`),
    }
    applyCaptureExclusion(win)
    expect(calls).toContain('protect:true')
    expect(calls).toContain('taskbar:true')
    expect(calls).toContain('top:true:screen-saver')
  })

  it('places the window in the top-right of the work area', () => {
    expect(overlayPosition({ x: 0, y: 20, width: 1440, height: 860 }, { width: 420, height: 720 })).toEqual({
      x: 1004,
      y: 36,
    })
  })

  it('formats global hotkeys for the current platform', () => {
    expect(formatHotkey(HOTKEY_TOGGLE_WINDOW, 'darwin')).toBe('⌘⇧Space')
    expect(formatHotkey(HOTKEY_CLICK_THROUGH, 'win32')).toBe('Ctrl+Shift+C')
    expect(HOTKEY_TOGGLE_WINDOW.startsWith('CommandOrControl')).toBe(true)
  })
})
