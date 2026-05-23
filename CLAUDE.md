# CLAUDE.md — xuexitong_ds (学习通 AI 答题助手)

## Overview

Chrome / Microsoft Edge browser extension that acts as an **AI-assisted answering helper** for the **Chaoxing Learning Platform (学习通)**. The extension extracts questions from the current page, optionally OCRs question images, sends them to AI models, and displays answer recommendations in a floating panel.

**The extension is NOT an automation bot.** It performs no automatic clicking, submission, page-turning, or hidden browser control. The user manually turns pages, selects answers, and submits. The extension only extracts + suggests.

## Tech Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| UI | React |
| Extension Manifest | V3 |
| Styling | TailwindCSS |
| AI Provider (initial) | DeepSeek API (Flash + Pro) |
| OCR (preferred) | PaddleOCR → Tesseract.js fallback |
| Storage | `chrome.storage.local` |

**Avoid:** jQuery, callback hell, giant files, monolithic architecture, Playwright/Puppeteer, auto-clicking systems.

## Project Structure (planned)

```
src/
  background/          # Service worker
  content/             # Content scripts
    dom-parser/        # DOM structure analysis
    question-extractor/# Question/option/image extraction
    iframe-handler/    # iframe traversal logic
    floating-panel/    # Draggable answer panel UI
  providers/           # AI model adapters (DeepSeek, OpenAI, Gemini…)
  ocr/                 # OCR pipeline (PaddleOCR → Tesseract.js)
  settings/            # API key + endpoint config UI
  storage/             # chrome.storage wrappers
  shared/              # Shared types & constants
  ui/                  # Shared React components
  utils/               # General utilities
  platforms/           # Platform-specific extractors
    chaoxing/          # 学习通 DOM handling
assets/
```

## Architecture Principles

1. **Everything runs locally.** No external backend server. Users bring their own API keys.
2. **Unified provider interface** for AI models — all providers implement the same contract so switching/adding models is trivial.
3. **Platform adapter pattern** — extraction logic per-platform (`platforms/chaoxing/`, future `platforms/xxx/`). Never hardcode all platform logic into one script.
4. **OCR is an independent, replaceable module.** PaddleOCR first, Tesseract.js fallback.
5. **Resilient DOM extraction** — avoid fragile selectors, support async rendering, lazy loading, iframe traversal, and dynamic DOM updates.

## Core Features

### 1. Floating Assistant Panel
Draggable floating panel containing: "Complete Current Page" button, model dropdown, API settings button, status display, answer result area, minimize button. Compact, modern, dark-mode support, non-blocking layout.

### 2. DOM Extraction
On "Complete Current Page" click: analyze DOM → detect question blocks → extract question text, options, images, question type. Supports: single choice, multiple choice, true/false. Future: fill-blank, short answer.

### 3. OCR Support
Image → OCR → extracted text → merged into question content. Independent module.

### 4. AI Model System
- **Flash model** (DeepSeek Flash): simple/factual questions, quick response.
- **Pro model** (DeepSeek Pro): difficult reasoning, complex questions, higher accuracy.
- Unified provider architecture: `providers/provider-interface.ts` → `deepseek.ts`, `openai.ts`, `gemini.ts`.

### 5. API Key Management
No accounts. Users input API key + endpoint + model via extension settings. Stored in `chrome.storage.local`. Never hardcode keys.

### 6. Answer Output Format
```
Question 1:
Answer: C
Confidence: 92%
Reason: Newton's second law.
```
Prioritize speed, readability, lightweight UI.

### 7. Chaoxing Special Handling
Chaoxing pages may have: nested iframes, async rendering, lazy loading, image-text mixed questions, dynamic DOM updates. Carefully handle iframe traversal and same-origin restrictions.

## Non-Goals (Do NOT implement)

- Automatic answer clicking
- Automatic submission
- Automatic next-page
- Anti-ban / bypass systems
- Hidden automation / browser control agents
- Browser automation (Playwright, Puppeteer)

## Development Workflow

Before implementing any feature:
1. Analyze DOM structure (for extraction tasks)
2. Explain the extraction strategy
3. Identify edge cases
4. Then implement → test → refactor

Never rush directly into implementation.

## Code Quality Rules

- TypeScript strict mode
- Modular code, avoid duplication
- Separate business logic clearly
- Comments for difficult/non-obvious logic
- async/await (no callback hell)
- Avoid giant classes
- Small, focused commits
- Before editing, analyze existing architecture
- When uncertain, ask before major rewrites

## Development Phases

| Phase | Scope |
|---|---|
| 1 | Extension scaffold, floating panel, DOM extraction |
| 2 | DeepSeek integration, answer rendering |
| 3 | OCR support |
| 4 | Settings system, model switching |
| 5 | Optimization, adapter architecture |

## Key Constraints

- Works after: loading unpacked extension + entering API key
- Usable by non-technical users
- No external backend
- Local-only execution
- Users responsible for their own API token usage

---

## Full Task Breakdown (2026-05-11 Analysis)

### Current State
- Empty repo: only README.md + logs/ + one Initial commit
- Zero source code, zero build config, zero infrastructure

### Phase 0 — Engineering Scaffold (CURRENT)

| # | Task | Why First |
|---|---|---|
| 0.1 | `package.json` + `tsconfig.json` + webpack config | No build = no TypeScript/React |
| 0.2 | `manifest.json` (Manifest V3) | Extension's identity — nothing loads without it |
| 0.3 | Directory structure under `src/` | Code needs somewhere to live |
| 0.4 | `src/background/` service worker | MV3 requires background |
| 0.5 | `src/content/` content script entry | Only way to inject into Chaoxing pages |

End state: extension loads in Chrome, passes basic smoke test.

### Phase 1 — Floating UI + DOM Extraction

| # | Task | Depends On |
|---|---|---|
| 1.1 | Draggable floating panel component | 0.2, 0.3, 0.5 |
| 1.2 | Inject panel into page DOM without conflicts | 1.1 |
| 1.3 | Minimize/expand, dark mode, drag handling | 1.2 |
| 1.4 | Research Chaoxing page DOM structure | — |
| 1.5 | `platforms/chaoxing/` — question block detector | 1.4 |
| 1.6 | `platforms/chaoxing/` — text/option/type extractor | 1.5 |
| 1.7 | `iframe-handler/` — iframe traversal | 1.4 |
| 1.8 | Wire extraction results into floating panel | 1.3, 1.6 |

End state: floating panel displays extracted question text from the page.

### Phase 2 — AI Integration

| # | Task | Depends On |
|---|---|---|
| 2.1 | `shared/types.ts` — Question, Answer, ProviderConfig | 0.1 |
| 2.2 | `providers/provider-interface.ts` — abstract interface | 2.1 |
| 2.3 | `providers/deepseek.ts` — DeepSeek API implementation | 2.2 |
| 2.4 | `storage/` — chrome.storage.local wrappers | 0.1 |
| 2.5 | `settings/` — API key + endpoint + model UI | 2.4, 1.1 |
| 2.6 | Wire: question → AI → answer → panel display | 1.8, 2.3, 2.5 |

End state: user enters API key → clicks button → sees AI-recommended answers.

### Phase 3 — OCR Support

| # | Task | Depends On |
|---|---|---|
| 3.1 | `ocr/ocr-interface.ts` | 2.1 |
| 3.2 | `ocr/paddleocr.ts` | 3.1 |
| 3.3 | `ocr/tesseract-fallback.ts` | 3.1 |
| 3.4 | Insert OCR pipeline into extraction flow | 1.6, 3.2, 3.3 |

### Phase 4 — Multi-Model + Settings Polish

| # | Task | Depends On |
|---|---|---|
| 4.1 | `providers/openai.ts` | 2.2 |
| 4.2 | `providers/gemini.ts` | 2.2 |
| 4.3 | Model switching logic + UI | 2.6, 4.1 |

### Phase 5 — Polish

| # | Task | Depends On |
|---|---|---|
| 5.1 | Formalize platform adapter abstraction | 1.6 |
| 5.2 | Error handling (network failures, API errors, DOM anomalies) | 2.6 |
| 5.3 | Performance (batch requests, caching) | 2.6 |

### Technical Risks (ranked)

| Risk Level | Problem | Why |
|---|---|---|
| **High** | DOM extraction on Chaoxing | Page structure undocumented, dynamic rendering, possible anti-scraping, obfuscated class names |
| **High** | iframe same-origin restrictions | Cross-origin iframes deny DOM access; content script may be partially blocked |
| **Medium** | OCR accuracy | Chinese formula/image recognition quality is the core OCR bottleneck |
| **Medium** | Floating panel CSS isolation | Must not pollute host page styles; z-index conflicts with page elements |
| **Low** | AI API integration | Standard HTTPS requests, mature technology |
| **Low** | React + TypeScript build | Standard engineering, well-established solutions |

### Key Unknown

The biggest unknown is the **actual DOM structure of Chaoxing exam/homework pages**. All downstream work depends on this. First real task (Phase 1.4) is reconnaissance: open real Chaoxing pages with DevTools and map out question containers, option structures, iframe nesting, image question patterns, and class/id naming conventions.
