export interface HealthStatus {
  ok: true
  service: 'pitchside'
}

export type BackendLink = 'unknown' | 'up' | 'down'

export interface HotkeyLabels {
  toggle: string
  clickThrough: string
  ask: string
}

export interface Snapshot {
  backend: BackendLink
  overlayVisible: boolean
  clickThrough: boolean
  platform: NodeJS.Platform
  hotkeys: HotkeyLabels
}

export interface SharePreview {
  image: string
  note: string
}

export function parseHealth(payload: unknown): HealthStatus | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (record.ok !== true || record.service !== 'pitchside') return null
  return { ok: true, service: 'pitchside' }
}

export interface PitchsideBridge {
  getSnapshot: () => Promise<Snapshot>
  refreshHealth: () => Promise<Snapshot>
  showOverlay: () => Promise<void>
  hideOverlay: () => Promise<void>
  showPanel: () => Promise<void>
  toggleClickThrough: () => Promise<boolean>
  testShare: () => Promise<SharePreview>
  quit: () => Promise<void>
  onSnapshot: (listener: (snapshot: Snapshot) => void) => () => void
  onAskFocus: (listener: () => void) => () => void
}
