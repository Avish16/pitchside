import { useEffect, useState } from 'react'
import type { AppState, SettingsUpdate } from '../../shared/types'
import { Controls } from './components/Controls'
import { SettingsPanel } from './components/SettingsPanel'
import { SuggestionsPane } from './components/SuggestionsPane'
import { TitleBar } from './components/TitleBar'
import { TranscriptPane } from './components/TranscriptPane'
import { useCallSession } from './useCallSession'

export default function App() {
  const bridge = window.copilot
  const [appState, setAppState] = useState<AppState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<'call' | 'settings'>('call')
  const [micFallback, setMicFallback] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const session = useCallSession({ micFallback })

  useEffect(() => {
    if (!bridge) return
    void bridge
      .getState()
      .then((state) => {
        setAppState(state)
        session.setClickThrough(state.clickThrough)
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Could not read local settings')
      })
  }, [bridge, session.setClickThrough])

  if (!bridge) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="boot">
            <div>
              <strong>Open Call Copilot from the desktop app</strong>
              <p>Run npm run dev and use the overlay window. This page is the renderer, not a standalone site.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="boot">
            <p>{loadError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!appState) {
    return (
      <div className="shell">
        <div className="panel">
          <div className="boot">
            <p>Loading local settings…</p>
          </div>
        </div>
      </div>
    )
  }

  const hasKeys = appState.settings.hasDeepgramKey && appState.settings.hasOpenrouterKey
  const banner = session.clickThrough
    ? `Click-through is on. Press ${appState.hotkeys.clickThrough} to use the panel again.`
    : session.systemAudio === false
      ? session.systemAudioReason
      : null

  async function save(update: SettingsUpdate): Promise<void> {
    if (!bridge) return
    setSaving(true)
    setSettingsError(null)
    const result = await bridge.saveSettings(update)
    setSaving(false)
    if (!result.ok) {
      setSettingsError(result.error)
      return
    }
    setAppState((current) => (current ? { ...current, settings: result.settings } : current))
    setView('call')
  }

  return (
    <div className="shell">
      <div className="panel">
        <TitleBar
          live={session.live}
          systemAudio={session.systemAudio}
          onSettings={() => {
            setSettingsError(null)
            setView('settings')
          }}
          onHide={() => bridge.hide()}
        />
        {banner ? <p className="banner">{banner}</p> : null}
        {session.error ? <p className="error-line">{session.error}</p> : null}
        <div className="body">
          <TranscriptPane
            lines={session.lines}
            interims={session.interims}
            live={session.live}
            onClear={session.clearTranscript}
          />
          <SuggestionsPane cards={session.suggestions} live={session.live} />
        </div>
        <Controls
          live={session.live}
          busy={session.busy}
          hasKeys={hasKeys}
          clickThrough={session.clickThrough}
          micFallback={micFallback}
          platform={appState.platform}
          systemAudio={session.systemAudio}
          onStart={() => void session.start()}
          onStop={() => void session.stop()}
          onNeedKeys={() => setView('settings')}
          onToggleClickThrough={() => {
            void bridge.toggleClickThrough().then((enabled) => session.setClickThrough(enabled))
          }}
          onMicFallback={setMicFallback}
        />
        <p className="hotkeys">
          <kbd>{appState.hotkeys.toggle}</kbd> show or hide
          {' · '}
          <kbd>{appState.hotkeys.clickThrough}</kbd> click-through
        </p>
        {view === 'settings' ? (
          <SettingsPanel
            settings={appState.settings}
            saving={saving}
            error={settingsError}
            onClose={() => setView('call')}
            onSave={save}
            onOpenLink={(url) => {
              void bridge.openExternal(url)
            }}
            onQuit={() => bridge.quit()}
          />
        ) : null}
      </div>
    </div>
  )
}
