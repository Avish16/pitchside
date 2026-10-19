interface ControlsProps {
  live: boolean
  busy: boolean
  hasKeys: boolean
  clickThrough: boolean
  micFallback: boolean
  platform: NodeJS.Platform
  systemAudio: boolean | null
  onStart: () => void
  onStop: () => void
  onNeedKeys: () => void
  onToggleClickThrough: () => void
  onMicFallback: (value: boolean) => void
}

export function Controls({
  live,
  busy,
  hasKeys,
  clickThrough,
  micFallback,
  platform,
  systemAudio,
  onStart,
  onStop,
  onNeedKeys,
  onToggleClickThrough,
  onMicFallback,
}: ControlsProps) {
  const fallbackLocked = live || systemAudio === true
  return (
    <>
      <label className="fallback">
        <input
          type="checkbox"
          checked={systemAudio === true ? false : micFallback}
          disabled={fallbackLocked}
          onChange={(event) => onMicFallback(event.target.checked)}
        />
        <span>
          <strong>Microphone is the other person</strong>
          <br />
          {systemAudio === true
            ? 'System audio is the other person, so the microphone stays labeled as you.'
            : platform === 'darwin'
              ? 'Used when system audio is missing. On macOS that fallback is expected unless a virtual device is routed in.'
              : 'Used when system audio is missing. Windows normally captures the other person with loopback instead.'}
        </span>
      </label>
      <div className="controls">
        {live ? (
          <button type="button" className="primary stop" onClick={onStop} disabled={busy}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={hasKeys ? onStart : onNeedKeys}
          >
            {busy ? 'Connecting…' : hasKeys ? 'Start listening' : 'Add API keys'}
          </button>
        )}
        <button type="button" className="ghost" onClick={onToggleClickThrough}>
          {clickThrough ? 'Click-through on' : 'Click-through'}
        </button>
      </div>
    </>
  )
}
