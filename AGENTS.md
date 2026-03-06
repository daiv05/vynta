# AGENTS.md — AI Agent Guide for Vynta

This document provides **explicit instructions and context for AI coding agents**
(GitHub Copilot, Copilot Chat, Cursor, Claude Code, etc.) working on **Vynta**.

Its goal is to ensure that generated code, documentation, and tests are:

- Consistent with the project vision
- Modular and maintainable
- Safe, reviewable, and aligned with architectural decisions

---

## Project Overview

**Vynta** is a Windows desktop application for **real-time screen annotation, cursor highlighting, spotlighting, and zooming**, designed as:

> **"A Windows alternative to Presentify"**

The app is intended for:

- Presentations
- Teaching and live demos
- Screen recording and streaming
- Visual explanations during meetings

### Core Stack

- **Tauri 2** (Rust backend + WebView)
- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript**
- **Pinia** (State Management)
- **Vue I18n** (Internationalization)
- **HTML Canvas / WebGL** for overlays and drawing
- **Windows-first focus**

**IMPORTANT**: This project does **NOT** use `vue-router`. Routing is handled manually via `App.vue` and URL parameters (`?overlay=true`, etc.) to switch between different "Shell" components.

---

## Design Reference (MANDATORY)

Before making architectural or feature-level changes, agents **must read**:

- `/docs/design_doc.md`

This document defines:

- Product goals
- Feature scope
- UX principles
- Technical constraints
- Performance requirements

Agents **must not contradict or override decisions** in the design doc unless explicitly instructed by a human maintainer.

## Tauri docs

Agents should refer to the official Tauri documentation for backend-related tasks:

- https://tauri.app/start/

Notes:

- If unsure about Tauri APIs or best practices, always consult the docs first.
- If you encounter many problems with typing after several iterations, comment on it and ask the user for changes or manual investigation.

## Core changes

Changes to the display of any of the modes in their respective "shells" must always be reflected and updated in the previews shown in the app's Settings.

---

## Development Commands (npm)

Agents should assume **npm** is the package manager.

```bash
# Install dependencies
npm install

# Run app in development mode
npm run tauri dev

# Production frontend build
npm run build

# Linting (OXLint)
npm run lint

# Fix linting issues
npm run lint:fix

# Verify types
npm run types
```

If a command is missing or unclear, **do not invent new scripts**, ask for clarification or inspect `package.json`.

The development server will usually ALWAYS be running, so **DO NOT START** new ones. If it is necessary to restart, always mention it.

---

## Repository Structure

```
/
├── src/                     # Vue frontend
│   ├── components/
│   ├── composables/
│   ├── stores/              # Pinia Stores
│   ├── locales/             # i18n JSONs
│   ├── utils/
│   ├── constants/
│   ├── types/
│   └── App.vue              # Main entry point & Manual Router
├── src-tauri/               # Tauri (Rust) backend
│   ├── src/
│   └── tauri.conf.json
├── docs/
│   └── design_doc.md        # Product & architecture design
├── package.json
└── AGENTS.md
```

Agents must **respect module boundaries** between frontend, backend, and shared logic.

---

## Coding Conventions

### Frontend (Vue / TypeScript)

- Use **Vue 3 Composition API only** (`<script setup lang="ts">`)
- **State Management**: Use **Pinia** stores in `src/stores/`. Do not implement complex state in components.
- **Internationalization**: Use **Vue I18n**. All user-facing text must be in `src/locales/`.
- **Routing**: **DO NOT use vue-router**. Verify `App.vue` logic for switching views based on window URL flags.
- Prefer **composables** for reusable logic.
- Keep components:
  - Small
  - Single-responsibility
  - UI-focused
- Avoid business logic inside `.vue` templates.
- Strong typing is required (no `any` unless justified).

### Backend (Rust / Tauri)

- Follow Rust safety and ownership principles.
- Minimize surface area exposed to the frontend.
- Validate all inputs crossing the JS - Rust boundary.
- Prefer small, focused commands over monolithic APIs.

---

## Modularity Rules (Very Important)

Agents must design features as **independent modules** following these patterns:

### Frontend Patterns

1.  **Shell Architecture**:
    - Each major mode (Overlay, Whiteboard, etc.) has a dedicated **Shell Component** in `src/components/{mode}/{Mode}Shell.vue`.
    - The Shell is the entry point for that mode's UI and logic.
    - **Do not** mix logic between shells (e.g., Whiteboard logic should not be in OverlayShell).

2.  **Window Management**:
    - Window-specific logic (resizing, positioning, events) belongs in `src/composables/use{Mode}Window.ts`.
    - Example: `useOverlayWindow.ts` handles overlay-specific window behavior.

3.  **State Management**:
    - Use **Pinia** stores (`src/stores/`) for shared state.
    - `settings.ts`: Persistent user preferences.
    - `tools.ts`: Tool state (color, brush size) shared across modes.

4.  **Drawing Engine**:
    - Canvas logic resides in `src/composables/useCanvasDrawing.ts`.
    - Rendering helpers are in `src/utils/canvas/`.
    - **Strict separation**: The drawing engine should not know about the Vue UI structure.

### Backend Patterns (Rust)

1.  **Module Structure**:
    - `lib.rs`: Main entry point and plugin registration.
    - `commands.rs`: All Tauri commands callable from frontend.
    - `window.rs`: Window creation and management logic.
    - `monitor.rs`: Multi-monitor handling.
    - `zoom.rs`: Screen magnifying logic.

2.  **Adding Features**:
    - If a feature needs backend support, create a new module (or extend an existing one) and expose functionality via `commands.rs`.
    - **Do not** put business logic directly in `lib.rs`.

**Do not create "god modules" or "god components."**

---

## Testing Expectations

**Frontend**:

- Currently, there is **NO** frontend test runner (Vitest/Jest) configured.
- Agents should NOT write frontend unit tests unless they also set up the infrastructure (ask user first).
- Verification is **manual**.

**Backend (Rust)**:

- Write standard Rust unit tests (`#[test]`) inside modules where logic resides.
- Run tests via `cargo test` (or `npm run tauri test` if configured).

If testing is not feasible (e.g., OS-level behavior, GUI interactions), document the limitation clearly and provide a manual verification plan.

---

## Git & Workflow Rules

Agents should follow these rules:

- Use descriptive branch names (`feature/spotlight-mode`)
- Write clear, concise commit messages
- Never commit secrets, tokens, or credentials
- Do not modify CI/CD workflows unless instructed
- Prefer Pull Requests over direct commits to `main`

---

## Security & Safety Constraints

Agents **must not**:

- Add telemetry or tracking without approval
- Introduce auto-updates or background services without review
- Access filesystem paths outside app scope
- Store sensitive data unencrypted
- Bypass Tauri security settings

---

## Expected Agent Behavior

When asked to implement a feature, an agent should:

1. Review `/docs/design_doc.md`
2. Identify the correct module (Shell/Store)
3. Propose a modular implementation
4. Add backend tests if applicable
5. Update documentation if behavior changes
6. Avoid unnecessary refactors

---

If something is ambiguous, **ask before acting**.
