# Pitchside

Pitchside is a desktop sideline for sales and customer calls. An always-on-top overlay shows the live transcript and talking points. A separate control panel is where you set up the call. Provider API keys never live in the desktop app.

This repository is a pnpm workspace:

- `apps/desktop` — Electron, electron-vite, React 19
- `apps/backend` — Fastify
- `packages/shared` — types shared by both

## Run

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the backend on `http://127.0.0.1:43124` and opens two windows: the overlay and the control panel. The menu-bar tray icon can show either window or quit.

```bash
pnpm test
pnpm typecheck
pnpm build
```

The product is built in phases. Phase 0 is the monorepo shell: two windows, a typed preload bridge, and the tray. Later phases add capture exclusion, model answers, audio, the knowledge base, the deck navigator, triage, and post-call notes.

Pitchside is for calls you are part of. It is not an interview-cheating tool.
