# Claude Memory -- Local persistent memory plugin for Claude Code

Automatically remembers context across sessions using a local SQLite database. No API keys, no cloud -- all data at `~/.claude-memory/memories.db`.

## Installation

```bash
git clone https://github.com/fderop/claude-supermemory.git
cd claude-supermemory
npm install
npm run build
cd plugin && npm install && cd ..
```

Then in Claude Code, install the plugin:

```
/install-plugin /path/to/claude-supermemory/plugin
```

## How it works

2 hooks fire automatically during Claude Code sessions:

- **SessionStart** -- queries SQLite for memories matching the current project, injects them into context
- **Stop** -- parses the session transcript (NDJSON), saves new turns to SQLite

Memories are scoped per-project via SHA256 hash of the git root. Search uses FTS5 with porter stemming and BM25 ranking.

## Development

```bash
npm run build      # bundle src/ -> plugin/scripts/*.cjs
npm run lint       # biome check
npm run lint:fix   # biome auto-fix
```

No tests. Biome for linting/formatting (2-space indent, single quotes, semicolons). `better-sqlite3` is marked external in the esbuild config (native module).

## Key files

- `src/lib/local-db.js` -- `LocalMemoryDB` class: addMemory, search, getProfile, listMemories, deleteMemory
- `src/context-hook.js` -- SessionStart hook entry point
- `src/summary-hook.js` -- Stop hook entry point
- `src/lib/settings.js` -- config from `~/.claude-memory/settings.json` or `CLAUDE_MEMORY_*` env vars
- `src/lib/transcript-formatter.js` -- incremental transcript parsing, tracks last-captured UUID
- `src/lib/format-context.js` -- formats memories into `<supermemory-context>` XML for injection
- `scripts/build.js` -- esbuild bundler, 4 entry points -> plugin/scripts/*.cjs
