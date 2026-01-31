const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DB_DIR = path.join(os.homedir(), '.claude-memory');
const DB_PATH = path.join(DB_DIR, 'memories.db');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

class LocalMemoryDB {
  constructor() {
    ensureDbDir();
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content     TEXT NOT NULL,
        container   TEXT NOT NULL,
        metadata    TEXT DEFAULT '{}',
        custom_id   TEXT,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_memories_container
        ON memories(container);
      CREATE INDEX IF NOT EXISTS idx_memories_custom_id
        ON memories(custom_id);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at
        ON memories(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_container_custom_id
        ON memories(container, custom_id) WHERE custom_id IS NOT NULL;

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        content='memories',
        content_rowid='id',
        tokenize='porter unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `);
  }

  addMemory(content, containerTag, metadata = {}, customId = null) {
    const meta = JSON.stringify({
      sm_source: 'claude-code-plugin',
      ...metadata,
    });

    if (customId) {
      const existing = this.db
        .prepare(
          'SELECT id FROM memories WHERE container = ? AND custom_id = ?',
        )
        .get(containerTag, customId);

      if (existing) {
        this.db
          .prepare(
            "UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?",
          )
          .run(content, meta, existing.id);
        return { id: existing.id, status: 'updated', containerTag };
      }
    }

    const result = this.db
      .prepare(
        'INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)',
      )
      .run(content, containerTag, meta, customId);

    return {
      id: result.lastInsertRowid,
      status: 'created',
      containerTag,
    };
  }

  search(query, containerTag, options = {}) {
    const limit = options.limit || 10;
    const sanitized = query.replace(/['"]/g, ' ').trim();

    if (!sanitized) {
      return { results: [], total: 0, timing: 0 };
    }

    const start = Date.now();
    const rows = this.db
      .prepare(
        `SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(sanitized, containerTag, limit);

    const timing = Date.now() - start;

    return {
      results: rows.map((r) => ({
        id: r.id,
        memory: r.content,
        similarity: 1 / (1 + Math.abs(r.rank)),
        content: r.content,
        updatedAt: r.updated_at,
      })),
      total: rows.length,
      timing,
    };
  }

  getProfile(containerTag, query) {
    const recentRows = this.db
      .prepare(
        'SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5',
      )
      .all(containerTag);

    const staticFacts = recentRows.map((r) => {
      const firstLine = r.content.split('\n')[0];
      return firstLine.length > 200
        ? `${firstLine.slice(0, 200)}...`
        : firstLine;
    });

    let searchResults;
    if (query) {
      const result = this.search(query, containerTag, { limit: 10 });
      searchResults = {
        results: result.results,
        total: result.total,
        timing: result.timing,
      };
    }

    return {
      profile: {
        static: staticFacts,
        dynamic: [],
      },
      searchResults,
    };
  }

  listMemories(containerTag, limit = 20) {
    const rows = this.db
      .prepare(
        'SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(containerTag, limit);

    return {
      memories: rows.map((r) => ({
        id: r.id,
        content: r.content,
        metadata: JSON.parse(r.metadata || '{}'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }

  deleteMemory(memoryId) {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(memoryId);
    return { deleted: true };
  }

  close() {
    this.db.close();
  }
}

module.exports = { LocalMemoryDB };
