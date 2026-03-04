# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered physics tutoring app (Mechanik Lerntool) for d'Alembert's principle problems. Built with React 19, Vite 6, Tailwind CSS 4, and KaTeX for math rendering. Refactored into a modular component architecture.

## Commands

- **Dev (full stack)**: `npm run dev:all` (Vite on :3000 + Express on :3001)
- **Dev frontend only**: `npm run dev` (port 3000)
- **API server only**: `npm run server` (port 3001)
- **Parse OCR → DB**: `npm run parse` (re-generates `server/db/mechanik.db`)
- **Download images**: `npm run extract-images`
- **Build**: `npm run build`
- **Type check**: `npm run lint` (runs `tsc --noEmit`)
- **Preview production build**: `npm run preview`
- **Clean**: `npm run clean`

## Architecture

**Three-panel layout**: Header → Left (task description) + Right (subtasks panel + tabbed chat/cards/errors/formulas panel).

### Key Directories

- `src/components/ui/` — Reusable glass-morphism primitives (`GlassContainer`, `GlassButton`, `SolutionBox`, `TypingIndicator`, `MarkdownMath`). Use these when building any new UI surface.
- `src/components/chat/` — Chat tab: `ChatPanel` → `MessageBubble` + `ChatInput`. System messages render Markdown+KaTeX via react-markdown/rehype-katex.
- `src/components/task/` — Left panel (`TaskPanel`) and data-driven `SubtaskList` that renders dynamic data from the API.
- `src/hooks/useChat.ts` — Chat state management. Currently uses a 7-second mock timeout; replace the `setTimeout` block with a real Gemini API call.
- `src/hooks/useTask.ts` — Task fetching and prev/next navigation. Fetches from Express API on port 3001.
- `src/types/index.ts` — All TypeScript interfaces for props, data models, and API response types.
- `src/data/mockData.tsx` — Chat initial messages and mock response.
- `server/index.ts` — Express API server (port 3001) serving tasks from SQLite.
- `server/db/schema.sql` — SQLite schema for tasks + subtasks tables.
- `server/scripts/parse-ocr.ts` — Parser that converts OCR JSON → SQLite database (270 tasks, ~805 subtasks).
- `server/scripts/utils/` — Parser utilities (normalize, formula-parser, element-classifier).

### Design System

All design tokens live as CSS custom properties in `:root` in `src/index.css`. Glass-morphism utility classes (`.glass-panel`, `.glass-panel-soft`, `.neo-btn-green`, `.hover-neo-btn-green`, `.active-tab`) are defined in `@layer utilities` in the same file. Change colors/shadows globally by editing the `:root` variables.

### Critical Constraint

The visual design (glassmorphism effects, animations, spacing, colors, every CSS class) is finalized and must not be changed. All refactoring and new features must preserve the exact pixel-level appearance.

## Frontend Code Principles

These rules apply to all code changes in this project. Follow them strictly.

### Visual Integrity (Non-Negotiable)
- The existing UI is the finalized design. Do NOT change any pixel, color, spacing, animation, effect, or transition.
- When adding new screens or components, replicate the exact same visual language (glassmorphism, shadows, border-radius, font sizes).

### Design Tokens First
- All colors, shadows, blur values, and spacing constants live as CSS custom properties in `:root` in `src/index.css`.
- NEVER hardcode a hex color, rgba value, or shadow directly in a component or Tailwind class. Always reference or add a token in `:root`.
- When you need a new value, add it to `:root` with a descriptive name and use it everywhere.

### Component Reuse (DRY)
- Before creating any new UI element, check `src/components/ui/` for existing primitives (`GlassContainer`, `GlassButton`, `SolutionBox`, etc.).
- New reusable UI elements go into `src/components/ui/` with a barrel export in `index.ts`.
- Feature-specific components go into their own directory under `src/components/` (e.g. `chat/`, `task/`).

### Data-Driven, Not Copy-Paste
- Repeated UI structures (lists of items, tabs, subtasks) must be rendered from data arrays, not duplicated JSX blocks.
- Static/mock data lives in `src/data/`. Task content, messages, and configuration are defined there, not inline in components.

### Typed Everything
- Every component must have a typed props interface in `src/types/index.ts`.
- No `any` types. Use specific types for all props, state, and function signatures.

### Separation of Concerns
- UI logic (state, effects, handlers) goes into custom hooks in `src/hooks/`.
- Components are purely presentational where possible — they receive data and callbacks via props.
- This makes backend integration trivial: swap the implementation inside a hook, components don't change.

### New Pages / Screens
- Build new screens by composing existing `ui/` components + the glass utility classes from `index.css`.
- Follow the same layout patterns: `glass-panel-soft rounded-2xl p-6` for panels, `GlassContainer` for pill-shaped controls.
- This ensures every new screen automatically looks like it belongs to the same app.

## Environment

- Set `GEMINI_API_KEY` in `.env.local` for AI integration
- Path alias: `@/` resolves to project root
- Tailwind CSS 4 uses the `@tailwindcss/vite` plugin (no `tailwind.config.js`)
