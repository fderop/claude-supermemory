# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code plugin that provides persistent local memory using SQLite + FTS5. It uses lifecycle hooks to automatically capture session context and inject relevant memories into new sessions. Memories are scoped per-project (via SHA256 hash of git root) and per-user. All data stays on the user's machine — no API keys, no auth, no network calls.

## Commands

- `npm run build` — Bundle all source files into plugin/scripts/*.cjs via esbuild
- `npm run lint` — Check code with Biome
- `npm run lint:fix` — Auto-fix lint issues
- `npm run format` — Format code with Biome
- `npm run clean` — Remove built .cjs files

There are no tests in this project.

## Code Style

Uses **Biome** (not ESLint/Prettier). Config in `biome.json`:
- 2-space indentation, single quotes, always semicolons
- Scope: `src/**` and `scripts/**`

## Architecture

### Hook-Based Plugin System

The plugin registers 4 hooks in `plugin/hooks/hooks.json` that run as compiled Node.js scripts:

1. **SessionStart** → `context-hook.cjs` — Fetches user profile + relevant memories from local SQLite, injects them as `<supermemory-context>` XML
2. **UserPromptSubmit** → `prompt-hook.cjs` — Lightweight prompt processing
3. **PostToolUse** (Edit|Write|Bash|Task) → `observation-hook.cjs` — Observes tool usage for memory capture
4. **Stop** → `summary-hook.cjs` — Parses session transcript (NDJSON), extracts new turns since last capture, saves to SQLite

### Source Structure (`src/`)

- `context-hook.js`, `prompt-hook.js`, `observation-hook.js`, `summary-hook.js` — Hook entry points (read stdin JSON, write stdout JSON)
- `search-memory.js`, `add-memory.js` — Standalone CLI scripts for the super-search skill and manual memory addition
- `lib/local-db.js` — SQLite + FTS5 storage layer using `better-sqlite3`; DB at `~/.claude-memory/memories.db`
- `lib/settings.js` — Config hierarchy: `~/.claude-memory/settings.json` → `CLAUDE_MEMORY_*` env vars → defaults
- `lib/transcript-formatter.js` — Parses NDJSON transcript, tracks last captured UUID per session, formats turns with custom markup (`[turn:start]`, `[role:user]`, `[tool:Name]`)
- `lib/container-tag.js` — Project isolation via `claudecode_project_XXXX` tags (SHA256 of git root); user tags via git email hash
- `lib/format-context.js` — Formats memories for injection into session context
- `lib/compress.js` — Tool result compression
- `lib/stdin.js` — Hook I/O utilities

### Build Pipeline

`scripts/build.js` uses esbuild to bundle 6 entry points from `src/` → `plugin/scripts/*.cjs` (Node 18, CommonJS, minified, chmod 755). `better-sqlite3` is marked as external (native module).

### Plugin Commands

- `/claude-memory:index` — Triggers codebase exploration and saves findings to local memory

### Key Design Decisions

- All hooks communicate via stdin/stdout JSON — no direct API from the plugin manifest
- Transcript capture is incremental: tracks last-captured UUID to avoid re-processing turns
- "Read" tool results are always skipped in capture; other tool results are truncated to 500 chars
- System reminders and supermemory context blocks are filtered from captured transcripts
- FTS5 with porter stemming + BM25 ranking for memory search; similarity normalized via `1 / (1 + |rank|)`
- All data stored locally in `~/.claude-memory/` — no network calls required
