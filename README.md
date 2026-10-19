# Call Copilot

A desktop overlay for sales, marketing, and customer calls. It transcribes the conversation and streams short talking points when the other person asks a question or raises an objection.

Call Copilot is a meeting aid for calls you are actually part of. It is not an interview-cheating tool, and this repo does not try to hide the app from a person sitting next to you. The overlay stays on your screen. On Windows and macOS it also asks the OS to leave that window out of screen capture, so a prospect does not read your notes while you share a slide.

## What you get

- A frameless, semi-transparent, always-on-top overlay that skips the taskbar.
- `setContentProtection(true)`, which Electron maps to `WDA_EXCLUDEFROMCAPTURE` on Windows 10 2004+ and `NSWindowSharingNone` on macOS.
- Global hotkeys to show or hide the overlay and to toggle click-through.
- Microphone capture, plus system-audio loopback on Windows (WASAPI via `desktopCapturer` / `getDisplayMedia`).
- Streaming transcription through Deepgram Nova-3.
- Talking points from any OpenRouter model, grounded in a context doc you paste in (product, pricing, pitch, FAQs).
- API keys stored locally. When the OS keychain is available they are sealed with Electron `safeStorage`. Otherwise they sit in the app's user-data file.

Audio and transcripts are kept in memory for the session. The app does not write the call to disk.

## Setup

You need Node.js 22 or newer, and a display. The overlay is an Electron window, not a website.

```bash
npm install
cp .env.example .env   # optional
npm run dev
```

Paste keys in **Settings**, or put them in `.env` before the first launch. `.env` only fills settings that are still empty. Real keys must stay out of git. `.env` is gitignored; `.env.example` is the template.

| Variable | Purpose |
| --- | --- |
| `DEEPGRAM_API_KEY` | Streaming speech-to-text |
| `OPENROUTER_API_KEY` | Talking-point model |
| `OPENROUTER_MODEL` | Optional. Defaults to `openai/gpt-4.1-mini` |

Any OpenRouter model id works. A fast model is a better fit than a long reasoning model, because the overlay is meant to be glanced at mid-sentence.

On Linux, if the window is invisible, the compositor is not honoring a transparent window. Quit and start again with an opaque window:

```bash
CALL_COPILOT_OPAQUE=1 npm run dev
```

## How a call works

1. Open Settings and add both keys, the model, and a context doc. Include only facts you are willing for the model to repeat: pricing you can quote, differentiators, and answers you want for known objections.
2. Press **Start listening** and allow the microphone. On Windows the app also requests display capture so it can hear system audio. The video track is kept alive only because Chromium ties loopback audio to it. It is disabled, not shown, and not uploaded.
3. Join the meeting. Your microphone is labeled **You**. System audio is labeled **Them**.
4. When **Them** finishes a question or a common objection, the overlay streams a few bullet talking points.
5. **Stop** ends transcription. Hide the window with the title-bar control or the hotkey. The process keeps running so the hotkey can bring it back. Quit from Settings or the tray icon.

If system audio is not available, check **Microphone is the other person**. Use that for practice, for a speakerphone, or on macOS. Turn it off when the mic should be treated as your own voice and you have no system-audio channel; suggestions will not fire, because they only react to the other person.

### Hotkeys

| Action | Shortcut |
| --- | --- |
| Show or hide | `Ctrl+Shift+Space` (`⌘⇧Space` on macOS) |
| Click-through | `Ctrl+Shift+C` (`⌘⇧C` on macOS) |
| Detached DevTools | `Ctrl+Shift+I`, development only |

Click-through lets you click the meeting underneath the overlay. The panel stays visible. Press the click-through hotkey again to interact with it. The tray icon can also show the window, toggle click-through, and quit.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Launches the overlay with hot reload |
| `npm start` | Opens the last production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (detection, audio PCM, prompts, parsers, session wiring, capture-exclusion options) |
| `npm run build` | Compiles main, preload, and renderer to `out/` |
| `npm run dist` | Builds and packages with electron-builder for the current OS |
| `npm run dist:win` | NSIS installer |
| `npm run dist:mac` | DMG and zip. Run this on a Mac |
| `npm run dist:linux` | AppImage |

Packaging uses [electron-builder](https://www.electron.build/) and `electron-builder.yml`. Windows and macOS builds are not code-signed here, so SmartScreen and Gatekeeper will warn until you add your own certificates. macOS usage strings for the microphone, system audio, and display capture are already in the builder config.

`npm start` / `electron-vite preview` expects `npm run build` to have been run first.

## Check that screen capture skips the overlay

This has to be checked on a real Windows or macOS desktop. A headless VM cannot show the difference between the local monitor and a capture stream, and Linux currently ignores content protection.

1. Run the app (`npm run dev` or an installed build) on Windows 10 2004+ or macOS.
2. In Zoom, Teams, or Meet, share your **entire screen**. Or in OBS, add a Display Capture source.
3. You should still see the Call Copilot window on your own monitor. It should be missing from the shared or recorded image.
4. Repeat with a single-window share of some other app. The overlay should not appear there either.

Caveats:

- On Windows older than 10 2004, content protection can black the window out in the capture instead of omitting it.
- Some screenshot tools and older capture paths do not honor display affinity. Test the exact app you will share with.
- Exclusive fullscreen apps can still cover the overlay. A normal or windowed meeting is the intended setup.
- The overlay skips the taskbar. Use the hotkey or the tray icon to get it back. It can still show up in some OS window lists; this is not a stealth feature.

## Layout

The process boundary is the extension point. A future backend can replace the two factories in `src/main/ipc.ts` without rewriting the overlay: one opens a streaming transcriber, the other streams a model completion. Keys would then live on the server.

```
src/audio       PCM conversion (and the renderer capture pipeline)
src/stt         Deepgram client, utterance assembly, question and objection detection
src/llm         Prompt construction and OpenRouter streaming
src/overlay     Window options, hotkeys, capture exclusion
src/settings    .env loading, OS-keychain sealing, electron-store
src/main        App lifecycle, IPC, session coordination
src/preload     contextBridge API
src/renderer    Overlay UI
```

Detection is a heuristic over the other speaker's finished utterance (question shape, or phrases like "too expensive", "already have a vendor", "send me a deck"). It is deliberately local and testable. It will miss unusual objections and it will sometimes fire on small talk that looks like a question.

## Known limitations

- Screen-capture exclusion was not visually verified in this environment. The VM this project was built on has no way to compare a local window with a Zoom or OBS capture. Confirm it yourself on Windows or macOS.
- macOS system audio is best-effort. If loopback does not return an audio track, the app falls back to the microphone and says so. A virtual audio device can be routed into the mic; this version does not bundle one.
- Linux loopback is often missing, and `setContentProtection` is a no-op there. The overlay still runs.
- Speaker labels are "mic" versus "system audio", not model diarization. On a laptop without headphones the mic can hear the room.
- The context doc and the recent transcript are sent to Deepgram and to OpenRouter. Read both vendors' terms before a confidential call. Nothing in this app is a business associate agreement or a recording consent flow. You are responsible for telling the other people on the call if your local law or company policy requires it.
- There is no account, team workspace, billing, or metering. Keys live on the machine.
- Transcripts are not saved, and there is no meeting summary yet.
- The window is excluded from capture only after the OS honors `setContentProtection`. The product is still visible to anyone who can see your screen in person.
- Installers are unsigned.
- Question detection is English-oriented.
