import { app, dialog, ipcMain, desktopCapturer, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type {
  AnswerEvent,
  AskRequest,
  Citation,
  DesktopSettings,
  KnowledgeKind,
  SharePreview,
  Snapshot,
  TranscriptLine,
} from '@pitchside/shared'
import { Ipc } from '../ipc-channels'
import { streamBackendAnswer } from './answers'
import { KnowledgeStore, readNoteFile, readUrl } from './knowledge'
import { prepareCall } from './call'
import { BACKEND_URL, readBackendHealth } from './health'
import { hotkeyLabels } from './privacy'
import { readLocalSettings, updateLocalSettings } from './settings'
import { showOverlay, type DesktopWindows } from './windows'

let clickThrough = false
let afterClickThrough: () => void = () => undefined
let transcript: TranscriptLine[] = []

function isTranscriptLine(value: unknown): value is TranscriptLine {
  if (!value || typeof value !== 'object') return false
  const line = value as TranscriptLine
  return (
    typeof line.id === 'string' &&
    (line.speaker === 'you' || line.speaker === 'client') &&
    typeof line.text === 'string' &&
    typeof line.final === 'boolean'
  )
}

export function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function clickThroughEnabled(): boolean {
  return clickThrough
}

export function setClickThrough(overlay: BrowserWindow, enabled: boolean): boolean {
  clickThrough = enabled
  overlay.setIgnoreMouseEvents(enabled, { forward: true })
  afterClickThrough()
  return clickThrough
}

async function sharePreview(): Promise<SharePreview> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 960, height: 540 },
    })
    const source = sources[0]
    if (!source || source.thumbnail.isEmpty()) {
      return { image: '', note: 'No screen preview was available. A display is required.' }
    }
    return {
      image: source.thumbnail.toDataURL(),
      note: 'This is a live full-screen capture. On Windows and macOS the Pitchside overlay should be missing from it. Linux often ignores capture exclusion, so the overlay may still appear here.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Screen preview failed'
    return { image: '', note: message }
  }
}

export function registerIpc(
  windows: DesktopWindows,
  quit: () => void,
): { publish: () => Promise<void> } {
  const targets = (): BrowserWindow[] => [windows.overlay, windows.panel]

  const broadcast = (snapshot: Snapshot): void => {
    for (const window of targets()) {
      if (!window.isDestroyed()) window.webContents.send(Ipc.snapshot, snapshot)
    }
  }

  const broadcastAnswer = (event: AnswerEvent): void => {
    for (const window of targets()) {
      if (!window.isDestroyed()) window.webContents.send(Ipc.answer, event)
    }
  }

  const snapshot = async (): Promise<Snapshot> => ({
    backend: await readBackendHealth(),
    overlayVisible: windows.overlay.isVisible(),
    clickThrough,
    platform: process.platform,
    hotkeys: hotkeyLabels(process.platform),
  })

  const publish = async (): Promise<void> => {
    broadcast(await snapshot())
  }
  afterClickThrough = () => {
    void publish()
  }

  const currentSettings = (): DesktopSettings => ({
    ...readLocalSettings(settingsPath()),
    backendUrl: BACKEND_URL,
  })

  let knowledge: KnowledgeStore | null = null
  const knowledgeStore = (): KnowledgeStore => {
    if (!knowledge) knowledge = new KnowledgeStore(join(app.getPath('userData'), 'knowledge.json'))
    return knowledge
  }
  const warmKnowledge = (): void => {
    const settings = currentSettings()
    const context = knowledgeStore().context()
    void fetch(`${settings.backendUrl}/v1/warmup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.devToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => undefined)
  }
  warmKnowledge()

  ipcMain.handle(Ipc.getSnapshot, () => snapshot())
  ipcMain.handle(Ipc.refreshHealth, () => snapshot())
  ipcMain.handle(Ipc.showOverlay, async () => {
    showOverlay(windows.overlay)
    await publish()
  })
  ipcMain.handle(Ipc.hideOverlay, async () => {
    windows.overlay.hide()
    await publish()
  })
  ipcMain.handle(Ipc.showPanel, () => {
    windows.panel.show()
    windows.panel.focus()
  })
  ipcMain.handle(Ipc.toggleClickThrough, async () => {
    const enabled = setClickThrough(windows.overlay, !clickThrough)
    await publish()
    return enabled
  })
  ipcMain.handle(Ipc.testShare, () => sharePreview())
  ipcMain.handle(Ipc.quit, () => quit())
  ipcMain.handle(Ipc.getSettings, () => currentSettings())
  ipcMain.handle(Ipc.saveSettings, (_event, input: { devToken?: string }) => {
    const devToken = typeof input?.devToken === 'string' ? input.devToken : ''
    updateLocalSettings(settingsPath(), { devToken })
    return currentSettings()
  })
  ipcMain.handle(Ipc.acceptConsent, () => {
    updateLocalSettings(settingsPath(), { consentAccepted: true })
    return currentSettings()
  })
  ipcMain.handle(Ipc.prepareCall, () => {
    const settings = currentSettings()
    return prepareCall({
      consentAccepted: settings.consentAccepted,
      backendUrl: settings.backendUrl,
      devToken: settings.devToken,
    })
  })
  ipcMain.handle(Ipc.transcriptGet, () => transcript)
  ipcMain.handle(Ipc.transcriptSync, (_event, lines: unknown) => {
    if (!Array.isArray(lines)) return
    transcript = lines.filter(isTranscriptLine).slice(-400)
    if (!windows.overlay.isDestroyed()) windows.overlay.webContents.send(Ipc.transcript, transcript)
  })
  ipcMain.handle(Ipc.ask, (event, input: AskRequest) => {
    const question = input?.question?.trim() ?? ''
    const mode = input?.mode === 'deep' ? 'deep' : 'fast'
    if (!question) return { ok: false as const, error: 'Type a question first.' }
    const id = randomUUID()
    const settings = currentSettings()
    const citations = cleanCitations(input.citations)
    broadcastAnswer({ type: 'start', id, question, mode, citations })
    void streamBackendAnswer({
      backendUrl: settings.backendUrl,
      devToken: settings.devToken,
      body: {
        question,
        mode,
        context: input.context,
        notes: input.notes,
        transcript: input.transcript,
      },
      onDelta: (text) => broadcastAnswer({ type: 'delta', id, text }),
    })
      .then((result) => broadcastAnswer({ type: 'done', id, provider: result.provider }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'The answer failed'
        broadcastAnswer({ type: 'error', id, message })
      })
    void event
    return { ok: true as const, id }
  })
  ipcMain.handle(Ipc.knowledgeList, () => knowledgeStore().list())
  ipcMain.handle(Ipc.knowledgeContext, () => knowledgeStore().context())
  ipcMain.handle(Ipc.knowledgeSearch, (_event, query: unknown) => knowledgeStore().search(typeof query === 'string' ? query : ''))
  ipcMain.handle(Ipc.knowledgeRemove, (_event, id: unknown) => {
    if (typeof id === 'string') knowledgeStore().remove(id)
    warmKnowledge()
    return knowledgeStore().list()
  })
  ipcMain.handle(
    Ipc.knowledgeAdd,
    (_event, input: { title?: string; text?: string; kind?: KnowledgeKind; triggers?: string[] }) => {
      const text = typeof input?.text === 'string' ? input.text.trim() : ''
      if (!text) return { ok: false as const, error: 'Add some text first.' }
      const kind = input.kind === 'url' || input.kind === 'battlecard' ? input.kind : 'doc'
      const source = knowledgeStore().add({
        id: randomUUID(),
        title: typeof input.title === 'string' ? input.title : '',
        kind,
        text,
        triggers: Array.isArray(input.triggers) ? input.triggers.filter((item) => typeof item === 'string') : undefined,
      })
      warmKnowledge()
      return { ok: true as const, source }
    },
  )
  ipcMain.handle(Ipc.knowledgeUrl, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.trim()) return { ok: false as const, error: 'Paste a link first.' }
    try {
      const page = await readUrl(url.trim())
      const source = knowledgeStore().add({ id: randomUUID(), title: page.title, kind: 'url', text: page.text })
      warmKnowledge()
      return { ok: true as const, source }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The link could not be read.'
      return { ok: false as const, error: message }
    }
  })
  ipcMain.handle(Ipc.knowledgeOpen, async () => {
    const picked = await dialog.showOpenDialog(windows.panel, {
      title: 'Load a note',
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['txt', 'md', 'markdown'] }],
    })
    const filePath = picked.filePaths[0]
    if (picked.canceled || !filePath) return { ok: false as const, error: 'No file selected.' }
    try {
      const note = readNoteFile(filePath)
      if (!note.text.trim()) return { ok: false as const, error: 'That file was empty.' }
      const source = knowledgeStore().add({ id: randomUUID(), title: note.title, kind: 'doc', text: note.text })
      warmKnowledge()
      return { ok: true as const, source }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The file could not be read.'
      return { ok: false as const, error: message }
    }
  })

  for (const window of targets()) {
    window.on('show', () => void publish())
    window.on('hide', () => void publish())
  }

  return { publish }
}

function cleanCitations(citations: Citation[] | undefined): Citation[] {
  if (!Array.isArray(citations)) return []
  return citations.slice(0, 6).flatMap((citation) => {
    if (!citation || typeof citation.title !== 'string' || typeof citation.excerpt !== 'string') return []
    const kind = citation.kind === 'url' || citation.kind === 'battlecard' ? citation.kind : 'doc'
    return [{ title: citation.title.slice(0, 120), kind, excerpt: citation.excerpt.slice(0, 240) }]
  })
}

export function focusAsk(windows: DesktopWindows): void {
  windows.panel.show()
  windows.panel.focus()
  windows.panel.webContents.send(Ipc.askFocus)
}

export function focusDeep(windows: DesktopWindows): void {
  windows.panel.show()
  windows.panel.focus()
  windows.panel.webContents.send(Ipc.deepAsk)
}
