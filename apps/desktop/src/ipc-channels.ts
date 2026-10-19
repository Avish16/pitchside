export const Ipc = {
  getSnapshot: 'snapshot:get',
  refreshHealth: 'health:refresh',
  showOverlay: 'overlay:show',
  hideOverlay: 'overlay:hide',
  showPanel: 'panel:show',
  toggleClickThrough: 'overlay:click-through',
  testShare: 'share:test',
  quit: 'app:quit',
  snapshot: 'snapshot',
  askFocus: 'ask:focus',
} as const
