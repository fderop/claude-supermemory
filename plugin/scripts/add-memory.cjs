#!/usr/bin/env node
var T=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var N=T((M,R)=>{var O=require("better-sqlite3"),l=require("node:fs"),p=require("node:path"),A=require("node:os"),d=p.join(A.homedir(),".claude-memory"),f=p.join(d,"memories.db");function h(){l.existsSync(d)||l.mkdirSync(d,{recursive:!0})}var E=class{constructor(){h(),this.db=new O(f),this.db.pragma("journal_mode = WAL"),this._migrate()}_migrate(){this.db.exec(`
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
    `)}addMemory(e,o,s={},r=null){let n=JSON.stringify({sm_source:"claude-code-plugin",...s});if(r){let i=this.db.prepare("SELECT id FROM memories WHERE container = ? AND custom_id = ?").get(o,r);if(i)return this.db.prepare("UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?").run(e,n,i.id),{id:i.id,status:"updated",containerTag:o}}return{id:this.db.prepare("INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)").run(e,o,n,r).lastInsertRowid,status:"created",containerTag:o}}search(e,o,s={}){let r=s.limit||10,n=e.replace(/['"]/g," ").trim();if(!n)return{results:[],total:0,timing:0};let a=Date.now(),i=this.db.prepare(`SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`).all(n,o,r),g=Date.now()-a;return{results:i.map(c=>({id:c.id,memory:c.content,similarity:1/(1+Math.abs(c.rank)),content:c.content,updatedAt:c.updated_at})),total:i.length,timing:g}}getProfile(e,o){let r=this.db.prepare("SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5").all(e).map(a=>{let i=a.content.split(`
`)[0];return i.length>200?`${i.slice(0,200)}...`:i}),n;if(o){let a=this.search(o,e,{limit:10});n={results:a.results,total:a.total,timing:a.timing}}return{profile:{static:r,dynamic:[]},searchResults:n}}listMemories(e,o=20){return{memories:this.db.prepare("SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?").all(e,o).map(r=>({id:r.id,content:r.content,metadata:JSON.parse(r.metadata||"{}"),createdAt:r.created_at,updatedAt:r.updated_at}))}}deleteMemory(e){return this.db.prepare("DELETE FROM memories WHERE id = ?").run(e),{deleted:!0}}close(){this.db.close()}};R.exports={LocalMemoryDB:E}});var S=T((x,_)=>{var{execSync:I}=require("node:child_process"),D=require("node:crypto");function m(t){return D.createHash("sha256").update(t).digest("hex").slice(0,16)}function u(t){try{return I("git rev-parse --show-toplevel",{cwd:t,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim()||null}catch{return null}}function L(t){let o=u(t)||t;return`claudecode_project_${m(o)}`}function w(t){return(u(t)||t).split("/").pop()||"unknown"}function F(){try{let e=I("git config user.email",{encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();if(e)return`claudecode_user_${m(e)}`}catch{}let t=process.env.USER||process.env.USERNAME||"anonymous";return`claudecode_user_${m(t)}`}_.exports={sha256:m,getGitRoot:u,getContainerTag:L,getProjectName:w,getUserContainerTag:F}});var{LocalMemoryDB:U}=N(),{getContainerTag:C,getProjectName:b}=S();async function y(){let t=process.argv.slice(2).join(" ");if(!t||!t.trim()){console.log('No content provided. Usage: node add-memory.cjs "content to save"');return}let e=process.cwd(),o=C(e),s=b(e);try{let n=new U().addMemory(t,o,{type:"manual",project:s,timestamp:new Date().toISOString()});console.log(`Memory saved to project: ${s}`),console.log(`ID: ${n.id}`)}catch(r){console.log(`Error saving memory: ${r.message}`)}}y().catch(t=>{console.error(`Fatal error: ${t.message}`),process.exit(1)});
