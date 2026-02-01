# Claude Memory

Local persistent memory plugin for Claude Code. Automatically remembers context across sessions using a local SQLite database. No API keys, no cloud -- all data stays at `~/.claude-memory/memories.db`.

## Features

- **Context Injection**: On session start, relevant memories are automatically injected into Claude's context
- **Automatic Capture**: Conversation turns are captured and stored when a session ends
- **Codebase Indexing**: Index your project's architecture, patterns, and conventions
- **Memory Search**: Search past sessions, decisions, and saved information

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

## How It Works

Two hooks fire automatically during Claude Code sessions:

- **SessionStart** -- queries SQLite for memories matching the current project, injects them into context
- **Stop** -- parses the session transcript (NDJSON), saves new turns to SQLite

Memories are scoped per-project via SHA256 hash of the git root. Search uses FTS5 with porter stemming and BM25 ranking.

## Commands

### /claude-supermemory:index

Index your codebase into local memory. Explores project structure, architecture, conventions, and key files, then saves a compiled summary.

```
/claude-supermemory:index
```

## Skills

### super-search

When you ask about past work, previous sessions, or want to recall information, the agent automatically searches your local memories.

## Configuration

### Environment Variables

```bash
CLAUDE_MEMORY_DEBUG=true    # Enable debug logging
```

### Settings File

Create `~/.claude-memory/settings.json`:

```json
{
  "maxProfileItems": 5,
  "debug": false
}
```

- `maxProfileItems` -- number of profile facts to inject into context (default: 5)
- `debug` -- enable verbose logging to stderr (default: false)

## License

MIT
