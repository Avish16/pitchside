# Pitchside

Pitchside is a desktop sideline for sales and customer calls. It keeps an always-on-top overlay next to the meeting and a control panel for setup. It is for calls you are part of. It is not an interview-cheating tool, and it does not hide its process from Activity Monitor or Task Manager.

Audio and the transcript stay on this computer. They leave only when you ask for an answer, draft the follow-up, or export notes.

## Layout

pnpm workspace with Turborepo:

- `apps/desktop` — Electron, electron-vite, React 19. Overlay, control panel, tray, local audio, knowledge, deck, and notes.
- `apps/backend` — Fastify. Issues short-lived Deepgram tokens and streams model replies.
- `packages/shared` — types, prompts, local embeddings, triage, and deck hints.

Provider keys live only in `apps/backend/.env`. The desktop stores a dev access token, nothing else. Auth is that shared token for now. `EmailOtpChallenge` in `apps/backend/src/auth.ts` is the unused seam for email OTP later.

## Setup

Node 22.12 or newer and pnpm 10.

On Windows, in PowerShell:

```powershell
npm i -g pnpm@10.33.4
pnpm install
Copy-Item apps\backend\.env.example apps\backend\.env
```

On macOS or Linux:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
```

The root `package.json` pins `packageManager` to `pnpm@10.33.4`. Install that version. pnpm 10 does not run dependency build scripts unless the package is named in `pnpm.onlyBuiltDependencies`. This repo allows `electron`, `esbuild`, and `electron-winstaller`.

Put `XAI_API_KEY` in `apps/backend/.env`. `LLM_PROVIDER` is already `xai`. With the key empty, `pnpm dev` still runs. Answers are labeled `[offline demo]`, and listening falls back to practice lines.

### `Error: Electron uninstall`

electron-vite throws this when `node_modules/electron/path.txt` is missing. pnpm 10 will skip a dependency postinstall that is not in `onlyBuiltDependencies`, but Electron 44 does not ship one: the binary is no longer downloaded by Electron's own install script. `pnpm install` runs `node node_modules/electron/install.js` from the root package so a fresh install still fetches it.

If `pnpm dev` still reports `Electron uninstall`, approve any blocked build scripts and download the binary:

```powershell
pnpm approve-builds
node node_modules/electron/install.js
```

| Variable | Role |
| --- | --- |
| `PITCHSIDE_DEV_TOKEN` | Shared token the desktop sends. Default `pitchside-dev`. |
| `LLM_PROVIDER` | `xai` (default), `anthropic`, or `openrouter`. Wins over `PITCHSIDE_PROVIDER`. |
| `XAI_API_KEY` | xAI key. The client calls `https://api.x.ai/v1`. |
| `ANTHROPIC_API_KEY` | Used when `LLM_PROVIDER=anthropic`. |
| `OPENROUTER_API_KEY` | Used when `LLM_PROVIDER=openrouter`. |
| `DEEPGRAM_API_KEY` | Minted into a one-minute token. The desktop connects to Deepgram itself. |
| `PITCHSIDE_FAST_MODEL` | Live answers. Default `grok-4.3` on xAI, `claude-haiku-5-5` otherwise. |
| `PITCHSIDE_TRIAGE_MODEL` | Ambiguous-line fallback. Default `grok-4.3` on xAI. |
| `PITCHSIDE_DEEP_MODEL` | Deep answer and post-call draft. Default `grok-4.7` on xAI, `claude-opus-5-5` otherwise. |

Those model ids are config. Anthropic still marks the system prompt and the knowledge block with `cache_control`. xAI does not: the same text is sent in the system message, and a `prompt_cache_key` is set so repeated prefixes can stick to one server. OpenRouter receives the text with no cache marker. The desktop still warms the prefix when notes change.

## Run

```bash
pnpm dev
```

The backend listens on `http://127.0.0.1:43124`. The Electron renderer dev server uses port `43123`. Two windows open:

- **Overlay** — frameless, always on top, not focused when it appears. Capture exclusion is requested with `setContentProtection`. On macOS the app uses the accessory activation policy so it stays out of the Dock and the app switcher. Both windows skip the taskbar. The process name stays visible.
- **Control panel** — status, listening, questions, knowledge, deck, and the post-call draft. The tray icon can show it again.

Hotkeys (Command on macOS, Ctrl elsewhere):

| Shortcut | Action |
| --- | --- |
| Shift+Space | Show or hide the overlay without stealing focus |
| Shift+C | Click-through on the overlay |
| Shift+A | Focus the question box |
| Shift+D | Send the current question as a deep answer |

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Using it on a call

1. **Start listening.** The first time, confirm the reminder. Microphone and system audio are separate streams. On macOS, system audio is ScreenCaptureKit through Electron's loopback. On Windows it is WASAPI. One Deepgram socket stays open for the meeting, stereo 16 kHz, channel 0 labeled You and channel 1 labeled Client. Local voice activity holds silence and sends keepalive instead of audio. Partial and final lines both show.
2. **Practice a client line** if there is no microphone or no Deepgram key. That line follows the same transcript, triage, deck, and answer path. Nothing is uploaded for the practice line itself.
3. **Knowledge.** Save a note, load a text file, fetch a link, or save a battlecard. Text is chunked and embedded in memory. There is no vector database. A client question retrieves notes locally, then the backend streams a grounded answer. The card cites the notes that were sent.
4. **Deck.** Load a PDF. Slide text is embedded locally. A matching line shows "Jump to slide N" with no model call.
5. **Triage.** Local rules mark question, objection, buying signal, small talk, or other. The fast model runs only when the line matches more than one kind. Objections and buying signals surface a battlecard.
6. **After the call.** Draft follow-up sends the transcript you already have and streams a summary, next steps, and an email with the deep model. Export writes a markdown file. The transcript is included only if you check that box. Audio is never exported.

## Package

```bash
pnpm dist
```

That builds the desktop app and runs electron-builder (`apps/desktop/electron-builder.yml`): NSIS on Windows, dmg and zip on macOS, AppImage on Linux. Output goes to `apps/desktop/release`. Installers are unsigned. macOS usage strings cover the microphone, system audio, and the display capture used for loopback and the share preview. Video from that capture is not uploaded.

The backend is not packaged inside the installer. Run it beside the app (`pnpm --filter @pitchside/backend start`) and point the desktop at it with `PITCHSIDE_BACKEND_URL` if it is not on `http://127.0.0.1:43124`.

## Check capture exclusion

`setContentProtection(true)` maps to `WDA_EXCLUDEFROMCAPTURE` on Windows 10 2004 and later, and to `NSWindowSharingNone` on macOS. Linux ignores it.

Before a real call, on Windows or macOS:

1. Show the overlay over a window you will share.
2. In the control panel, choose **Test my share**. The thumbnail is a full-display capture. The overlay should be missing from it.
3. Start a Zoom or OBS share of that display and confirm the overlay is absent for the other person while you still see it locally.

Click-through lets you operate the meeting underneath the overlay. Turn it off with the same hotkey to use the overlay's hide button.

## Limits

Verified here with `pnpm test`, `pnpm typecheck`, and `pnpm build` on Linux. The two windows were opened in an earlier desktop pass. What this headless-style Linux VM cannot prove:

- **macOS system audio.** ScreenCaptureKit loopback needs a Mac. There is no Swift capture addon in this repo. Electron's `audio: 'loopback'` handler is the macOS path, and it was not exercised here.
- **Windows loopback.** The same handler is WASAPI on Windows. It is implemented and untested on Windows.
- **Capture exclusion.** Linux does not honor `setContentProtection`. A Zoom or OBS check on Windows or macOS is still required. The in-app preview may still show the overlay on Linux, and the preview says so.
- **A live Deepgram socket and a live xAI, Anthropic, or OpenRouter stream.** Those need keys in `apps/backend/.env`. The offline demo and the unit tests cover the client, the token grant shape, and the SSE parser.
- **Global hotkeys, the tray, and a real microphone** depend on a desktop session. This environment has no session bus, so the tray can fail to register. The windows still open. A missing microphone leaves practice lines working.
- **English heuristics** for triage and question detection. Other languages fall through to "other" or the model fallback.
- **Hashed local embeddings**, not a hosted embedding model. They are good enough to pick a nearby note or slide. They are not a search engine.
- **No accounts, billing, or email OTP.** The dev token is the only check. Do not expose the backend beyond localhost with that token.
- **Unsigned installers**, and no notarization.
