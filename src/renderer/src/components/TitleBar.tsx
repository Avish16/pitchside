interface TitleBarProps {
  live: boolean
  systemAudio: boolean | null
  onSettings: () => void
  onHide: () => void
}

export function TitleBar({ live, systemAudio, onSettings, onHide }: TitleBarProps) {
  return (
    <>
      <header className="titlebar">
        <div className="mark" aria-hidden="true">
          <span />
        </div>
        <div className="wordmark">
          <strong>Call Copilot</strong>
          <small>Talking points for sales and customer calls</small>
        </div>
        <div className="title-actions">
          <button type="button" className="icon-button" aria-label="Settings" title="Settings" onClick={onSettings}>
            <GearIcon />
          </button>
          <button type="button" className="icon-button" aria-label="Hide overlay" title="Hide" onClick={onHide}>
            <MinusIcon />
          </button>
        </div>
      </header>
      <div className="status-row">
        <span className={live ? 'chip live' : 'chip'}>
          <span className="dot" aria-hidden="true" />
          {live ? 'Listening' : 'Idle'}
        </span>
        <span className="chip">
          {systemAudio == null ? 'Mic + system audio' : systemAudio ? 'Mic and system audio' : 'Microphone only'}
        </span>
        <span className="chip" title="Windows and macOS leave this window out of screen capture. Confirm with a test share.">
          Excluded from capture
        </span>
      </div>
    </>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.5a7.7 7.7 0 0 0 .1-3l1.8-1.4-1.8-3.1-2.2.6a7.8 7.8 0 0 0-2.6-1.5L14.2 3h-4.4l-.5 2.1a7.8 7.8 0 0 0-2.6 1.5l-2.2-.6L2.7 9.1 4.5 10.5a7.7 7.7 0 0 0 .1 3L2.8 14.9l1.8 3.1 2.2-.6a7.8 7.8 0 0 0 2.6 1.5l.5 2.1h4.4l.5-2.1a7.8 7.8 0 0 0 2.6-1.5l2.2.6 1.8-3.1-1.8-1.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
