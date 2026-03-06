# Contributing

This guide covers how to set up a development environment for Vynta and the conventions to follow when contributing.

## Prerequisites

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org/) | LTS (20+) |
| [Rust](https://rustup.rs/) | Stable toolchain |
| [Tauri CLI](https://tauri.app/start/) | v2 |

Ensure you also have the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/#windows) installed (WebView2, Visual Studio Build Tools).

## Setup

```bash
# Clone the repository
git clone https://github.com/daiv05/vynta.git
cd vynta

# Install frontend dependencies
npm install

# Run in development mode (frontend + Tauri backend)
npm run tauri dev
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (frontend only) |
| `npm run build` | TypeScript check + production frontend build |
| `npm run tauri dev` | Full development mode (frontend + Rust backend) |
| `npm run types` | TypeScript type checking |
| `npm run lint` | Run OxLint linter |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run docs:dev` | Start VitePress docs dev server |
| `npm run docs:build` | Build docs for production |

## Project Structure

```
├── src/                  # Vue 3 frontend
│   ├── components/       # Vue components (shells, panels, UI)
│   ├── composables/      # Reusable composition functions
│   ├── stores/           # Pinia stores
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # Static constants (shortcuts)
│   ├── locales/          # i18n translation files
│   └── utils/            # Utility modules
├── src-tauri/            # Rust backend
│   ├── src/              # Rust source code
│   └── tauri.conf.json   # Tauri configuration
├── docs/                 # VitePress documentation
└── public/               # Static assets
```

## Coding Conventions

### Frontend (Vue / TypeScript)

- **Always use** `<script setup lang="ts">`
- **State management** — Use Pinia stores in `src/stores/`, not component-level complex state
- **All user-facing text** must go through Vue I18n (`src/locales/`)
- **No `vue-router`** — Routing is handled via URL parameters in `App.vue`
- **Composables** for reusable logic
- **Strong typing** — No `any` unless absolutely necessary
- Components should be **small, focused, and single-responsibility**

### Backend (Rust)

- Follow Rust **ownership and safety** principles
- **Minimize** the surface area exposed to the frontend
- **Validate** all inputs crossing the JS ↔ Rust boundary
- Prefer **small, focused commands** over monolithic APIs
- New features needing backend support should be in **dedicated modules**

### Modularity

- Each mode has its own **Shell component** — do not mix mode logic across shells
- Window-specific logic belongs in `use{Mode}Window.ts` composables
- The drawing engine (`useCanvasDrawing.ts`) must not depend on Vue UI structure
- Do **not** create "god modules" or "god components"

## Git Workflow

- Use descriptive branch names: `feature/spotlight-mode`, `fix/cursor-position`
- Write clear, concise commit messages
- Prefer Pull Requests over direct commits to `main`
- Never commit secrets, tokens, or credentials
- Do not modify CI/CD workflows unless instructed

## Testing

### Frontend

Currently, there is **no frontend test runner** configured. Verification is manual. If you want to add testing infrastructure, discuss it first with maintainers.

### Backend (Rust)

Write standard Rust unit tests (`#[test]`) inside modules where logic resides:

```bash
cd src-tauri
cargo test
```

For OS-level behavior (window management, cursor tracking), provide a **manual verification plan** in your PR description.

## i18n

When adding user-facing text:

1. Add the key and English text to `src/locales/en.json`
2. Add the key and Spanish text to `src/locales/es.json`
3. Use `$t('key')` in templates or `t('key')` in `<script setup>`
