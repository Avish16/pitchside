import { useState } from 'react'
import type { PublicSettings, SettingsUpdate } from '../../../shared/types'

interface SettingsPanelProps {
  settings: PublicSettings
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (update: SettingsUpdate) => Promise<void>
  onOpenLink: (url: string) => void
  onQuit: () => void
}

export function SettingsPanel({
  settings,
  saving,
  error,
  onClose,
  onSave,
  onOpenLink,
  onQuit,
}: SettingsPanelProps) {
  const [model, setModel] = useState(settings.model)
  const [contextDoc, setContextDoc] = useState(settings.contextDoc)
  const [deepgramApiKey, setDeepgramApiKey] = useState('')
  const [openrouterApiKey, setOpenrouterApiKey] = useState('')
  const [clearDeepgram, setClearDeepgram] = useState(false)
  const [clearOpenrouter, setClearOpenrouter] = useState(false)

  return (
    <div className="settings">
      <header className="titlebar">
        <div className="wordmark">
          <strong>Settings</strong>
          <small>Keys stay on this computer</small>
        </div>
        <div className="title-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Back
          </button>
        </div>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSave({
            model,
            contextDoc,
            deepgramApiKey: deepgramApiKey.trim() || undefined,
            openrouterApiKey: openrouterApiKey.trim() || undefined,
            clearDeepgram,
            clearOpenrouter,
          })
        }}
      >
        <label>
          Deepgram API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={deepgramApiKey}
            placeholder={settings.hasDeepgramKey ? `Saved (${settings.deepgramHint})` : 'Paste a Deepgram key'}
            onChange={(event) => {
              setDeepgramApiKey(event.target.value)
              setClearDeepgram(false)
            }}
          />
        </label>
        <div className="field-row">
          <button type="button" className="linkish" onClick={() => onOpenLink('https://console.deepgram.com/')}>
            Open the Deepgram console
          </button>
          {settings.hasDeepgramKey ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setClearDeepgram(true)
                setDeepgramApiKey('')
              }}
            >
              {clearDeepgram ? 'Key will be cleared' : 'Clear saved key'}
            </button>
          ) : null}
        </div>

        <label>
          OpenRouter API key
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={openrouterApiKey}
            placeholder={settings.hasOpenrouterKey ? `Saved (${settings.openrouterHint})` : 'Paste an OpenRouter key'}
            onChange={(event) => {
              setOpenrouterApiKey(event.target.value)
              setClearOpenrouter(false)
            }}
          />
        </label>
        <div className="field-row">
          <button type="button" className="linkish" onClick={() => onOpenLink('https://openrouter.ai/models')}>
            Browse OpenRouter models
          </button>
          {settings.hasOpenrouterKey ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setClearOpenrouter(true)
                setOpenrouterApiKey('')
              }}
            >
              {clearOpenrouter ? 'Key will be cleared' : 'Clear saved key'}
            </button>
          ) : null}
        </div>

        <label>
          Model
          <input
            value={model}
            spellCheck={false}
            onChange={(event) => setModel(event.target.value)}
            placeholder="openai/gpt-4.1-mini"
            required
          />
        </label>
        <p className="hint">Any model id from OpenRouter. A fast model keeps the cues short.</p>

        <label>
          Call context
          <textarea
            value={contextDoc}
            onChange={(event) => setContextDoc(event.target.value)}
            placeholder={'Product:\nWho it is for:\nPricing you can quote:\nDifferentiators:\nObjections and the answer you want:\nQuestions to defer:'}
          />
        </label>
        <p className="hint">
          {settings.keyStorage === 'os-keychain'
            ? 'API keys are encrypted with the operating system keychain.'
            : 'The OS keychain is unavailable here, so keys are stored in the local app data folder.'}{' '}
          Audio goes to Deepgram. The context and recent transcript go to the selected model through OpenRouter.
          Calls are not saved to disk.
        </p>
        <p className="hint">
          This window asks Windows and macOS to leave it out of screen capture so a prospect does not see your
          notes. Test that with Zoom or OBS before a real call. Restart listening after you change the Deepgram key.
        </p>
        {error ? <p className="error-line">{error}</p> : null}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="text-button spacer" onClick={onQuit}>
            Quit
          </button>
        </div>
      </form>
    </div>
  )
}
