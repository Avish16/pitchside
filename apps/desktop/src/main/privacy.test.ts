import { describe, expect, it } from 'vitest'
import {
  HOTKEY_ASK,
  HOTKEY_CLICK_THROUGH,
  HOTKEY_DEEP,
  HOTKEY_TOGGLE,
  applyCaptureExclusion,
  formatHotkey,
  hotkeyLabels,
  overlayWindowOptions,
  type PrivacyWindow,
} from './privacy'

describe('overlay privacy', () => {
  it('builds a non-activating overlay that skips the taskbar', () => {
    const options = overlayWindowOptions('/tmp/preload.js', 'darwin')
    expect(options.frame).toBe(false)
    expect(options.transparent).toBe(true)
    expect(options.skipTaskbar).toBe(true)
    expect(options.focusable).toBe(false)
    expect(options.hiddenInMissionControl).toBe(true)
    expect(options.type).toBe('panel')
    expect(options.alwaysOnTop).toBe(true)
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

  it('formats hotkeys without claiming they hide the process', () => {
    expect(formatHotkey(HOTKEY_TOGGLE, 'darwin')).toBe('⌘⇧Space')
    expect(formatHotkey(HOTKEY_CLICK_THROUGH, 'win32')).toBe('Ctrl+Shift+C')
    expect(formatHotkey(HOTKEY_ASK, 'linux')).toBe('Ctrl+Shift+A')
    expect(formatHotkey(HOTKEY_DEEP, 'darwin')).toBe('⌘⇧D')
    expect(hotkeyLabels('linux').deep).toBe('Ctrl+Shift+D')
  })
})
