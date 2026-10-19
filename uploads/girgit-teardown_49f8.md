# GirGit AI: Product Teardown & Build Plan
*Sources: girgit-ai.com pages (home, /features, /pricing, /how-it-works, /download, /faqs, /security, /compare/*, blog), all in the site's public JS bundle and sitemap. Checked Oct 19, 2026. I did not analyze the desktop app.*

## 0. What it actually is (correction)
**GirGit AI is not a marketing tool.** It is a **real-time AI interview copilot**: a desktop app that listens to a live job interview (Zoom, Teams, Meet), transcribes the interviewer's questions, and shows AI-generated answers in an **"invisible overlay"**. The site says the overlay "won't appear on screen shares, even if you share your whole display" and is hidden from the taskbar and task switching. It is in the same category as Cluely, Final Round AI, LockedIn AI, Parakeet AI and Sensei AI.

> ⚠️ **Ethics/legal flag:** The core value proposition is covert help during live interviews, and the site sells "stealth". GirGit also advertises human "OA-round booking" (online assessment help) over WhatsApp. Most employers consider this cheating. It can break interview-platform and employer terms, and it carries reputation and payment-processor risk (Razorpay and Stripe restrict "academic dishonesty" products). **Recommendation:** build the same tech positioned as an *interview practice coach plus a disclosed meeting/sales copilot*. That means no detection-evasion features, and the product should work the same whether or not it is visible. Everything below assumes that positioning.

## 1. Product
**Core features (from the site)**
- Real-time transcription of interview audio ("across accents, speaking speeds"), plus detection of when a question is asked.
- Context-aware answers built from the user's uploaded **resume + job description** (plus company and role fields).
- Invisible overlay that is excluded from screen share and the taskbar (stealth is included free; competitors charge extra for it).
- Coding copilot: DSA and coding-round guidance, solution approaches, multiple programming languages.
- Works alongside Zoom, Microsoft Teams, Google Meet and others.
- Mock/practice call mode to test the setup.
- Human add-on: OA-round booking and WhatsApp support (+91 number).
- Platforms: Windows 10/11 x64 (the main platform), macOS in beta (v1.2.21 DMG). Needs about 200 MB of disk.

**User flow:** download from /download (GitHub Releases installers) → install → sign in → upload resume and paste the JD, set company and role → run a practice call → join the real call → the app captures system audio, transcribes, detects questions and streams answers into the overlay → minutes are deducted → top up through Razorpay.

**Pricing:** pay-per-minute, **₹5/min (about $0.06)**, no tiers and no subscription. **10 free minutes** for each new account (blog says it "refreshes"). Top up "through multiple payment methods" (Razorpay). There are /free and /cheapest SEO pages.

**Target users:** Indian job seekers first (INR pricing, Razorpay, WhatsApp, Indian founders Palen Pushkar and Sanchita Chaudhary), especially software engineers doing DSA, OA and tech rounds, plus career switchers and price-sensitive users.

**Competitors (from their /compare pages):** Cluely (they cite its 2025 breach of 83k users), Final Round AI (about $149/mo), LockedIn AI, Parakeet AI ($29.50 for 3 credits), Sensei AI ($19/mo, 30+ languages). GirGit's positioning is about 95% cheaper, stealth included, and no subscription.

**Go-to-market:** heavy SEO. That includes a large blog, a grid of every "X vs Y" competitor comparison, JSON-LD FAQ schema, and a robots.txt that explicitly welcomes AI crawlers (GPTBot, ClaudeBot, PerplexityBot) for "AI search" visibility.

## 2. How it likely works (INFERENCE, not confirmed)
| Feature | Likely implementation |
|---|---|
| Audio capture | Windows: WASAPI loopback capture of system output (the interviewer) plus the mic. macOS: ScreenCaptureKit audio or a virtual device. Their blog links "how it captures system audio". |
| STT | Streaming ASR over WebSocket. The blog praises Deepgram Nova-3, AssemblyAI Universal Streaming and OpenAI Realtime, so it is probably one of these (Deepgram is the most likely given how often it's mentioned). |
| Question detection | Speaker separation (loopback = interviewer, mic = user) plus endpointing/VAD, then a small LLM or heuristic classifier that answers "is this a question, and is it complete?" |
| Answer generation | Streaming LLM call (the blog says "GPT-class, Claude-class or Gemini-class models with tuned system prompts"). The prompt includes the resume, JD and recent transcript window. Done server-side so API keys stay hidden and minutes can be metered. |
| Coding help | Screenshot or OCR of the problem, or the spoken problem, sent to a strong reasoning/code model. Returns approach, code and complexity. |
| Overlay "invisibility" | Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` plus a tool-window style (no taskbar entry). macOS `NSWindow.sharingType = .none`. *We should NOT build this evasion.* |
| Desktop shell | Probably Electron (cross-platform, releases distributed via GitHub). Could also be Tauri or native. |
| Metering/billing | Backend counts session minutes, keeps a prepaid wallet balance, and uses Razorpay orders with server-side signature verification (the site has `/api/create-booking-order` and `/api/verify-booking-payment`, plus the `/app-payment/`, `/payment-success/` and `/payment-failed/` routes). |
| Website | React + Vite SPA behind Cloudflare. Blog content is compiled into the JS bundle. Google Workspace and Brevo handle email. |

## 3. Recommended build (ethical "interview coach + meeting copilot")
**Stack**
- **Desktop:** Tauri 2 (Rust + React/TS) for a small binary, or Electron if speed of development matters more. Use native audio modules: WASAPI loopback (Windows) and ScreenCaptureKit (macOS 13+). Add a global hotkey, an always-on-top resizable panel, and a visible indicator that the copilot is on.
- **STT:** Deepgram Nova-3 streaming (diarization, low latency). Fallbacks are AssemblyAI streaming or self-hosted faster-whisper for practice mode.
- **LLM:** a fast model for detection and short answers (e.g. GPT-4.1-mini / Gemini Flash / Claude Haiku class) and a strong model for coding and deep follow-ups. Put a provider-agnostic gateway in front (LiteLLM or your own).
- **Backend:** TypeScript (Hono/Fastify) or Python FastAPI. A WebSocket relay handles STT → LLM streaming. Postgres (Supabase or Neon) for users, sessions, wallet and usage ledger. Redis for session state and rate limits. Object storage for resumes, encrypted.
- **Auth:** Supabase Auth or Clerk with Google sign-in and email OTP. The desktop app logs in through a browser deep-link (PKCE).
- **Payments:** Razorpay (India, UPI) plus Stripe (global). Prepaid minute wallet, with the ledger credited only after webhook or signature verification.
- **Website:** Next.js or Astro (SSG, better for SEO than their SPA) on Vercel or Cloudflare Pages. MDX blog, PostHog analytics, Resend/Brevo email.
- **Privacy:** by default store no audio. Transcripts are opt-in with auto-delete. Encrypt resumes. Keep secrets out of the repo (the Cluely breach is a sales point).
- **Ops:** Sentry, auto-updates (Tauri updater or electron-updater), code signing (Windows EV cert, Apple notarization).

**MVP (about 6–8 weeks)**
1. Sign-in, resume + JD upload, profile.
2. Practice mode: AI interviewer asks role-specific questions (TTS), you answer, you get scored feedback.
3. Live copilot: system-audio + mic capture → streaming transcript → question detection → streamed answer suggestions in a panel.
4. Per-minute metering, free minutes, Razorpay top-up.
5. Marketing site with pricing, download and docs.

**Roadmap**
- **Phase 2:** coding help (screenshot → solution), session summaries and notes, multilingual STT, a macOS build.
- **Phase 3:** a pivot toward meeting/sales calls (objection handling, CRM notes), team plans, Stripe for global users, a SOC2-lite security page.
- **Phase 4:** on-device STT option for privacy, custom knowledge bases, analytics on progress across practice sessions.

**Unit economics check:** Deepgram is about $0.005–0.008/min, and an LLM costs roughly $0.005–0.02/min of active Q&A. That gives a cost of about $0.01–0.03/min against their ₹5 (~$0.06) price, so the per-minute model is viable.

## Not determinable from public info
Their exact STT and LLM vendors, desktop framework, backend language and database, auth provider, and real user numbers.
