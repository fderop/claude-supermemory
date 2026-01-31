#!/usr/bin/env node
var T=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var N=T((P,g)=>{var S=require("better-sqlite3"),p=require("node:fs"),R=require("node:path"),O=require("node:os"),d=R.join(O.homedir(),".claude-memory"),A=R.join(d,"memories.db");function y(){p.existsSync(d)||p.mkdirSync(d,{recursive:!0})}var E=class{constructor(){y(),this.db=new S(A),this.db.pragma("journal_mode = WAL"),this._migrate()}_migrate(){this.db.exec(`
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
    `)}addMemory(e,r,a={},s=null){let i=JSON.stringify({sm_source:"claude-code-plugin",...a});if(s){let n=this.db.prepare("SELECT id FROM memories WHERE container = ? AND custom_id = ?").get(r,s);if(n)return this.db.prepare("UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?").run(e,i,n.id),{id:n.id,status:"updated",containerTag:r}}return{id:this.db.prepare("INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)").run(e,r,i,s).lastInsertRowid,status:"created",containerTag:r}}search(e,r,a={}){let s=a.limit||10,i=e.replace(/['"]/g," ").trim();if(!i)return{results:[],total:0,timing:0};let o=Date.now(),n=this.db.prepare(`SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`).all(i,r,s),m=Date.now()-o;return{results:n.map(c=>({id:c.id,memory:c.content,similarity:1/(1+Math.abs(c.rank)),content:c.content,updatedAt:c.updated_at})),total:n.length,timing:m}}getProfile(e,r){let s=this.db.prepare("SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5").all(e).map(o=>{let n=o.content.split(`
`)[0];return n.length>200?`${n.slice(0,200)}...`:n}),i;if(r){let o=this.search(r,e,{limit:10});i={results:o.results,total:o.total,timing:o.timing}}return{profile:{static:s,dynamic:[]},searchResults:i}}listMemories(e,r=20){return{memories:this.db.prepare("SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?").all(e,r).map(s=>({id:s.id,content:s.content,metadata:JSON.parse(s.metadata||"{}"),createdAt:s.created_at,updatedAt:s.updated_at}))}}deleteMemory(e){return this.db.prepare("DELETE FROM memories WHERE id = ?").run(e),{deleted:!0}}close(){this.db.close()}};g.exports={LocalMemoryDB:E}});var I=T(($,f)=>{var{execSync:h}=require("node:child_process"),D=require("node:crypto");function l(t){return D.createHash("sha256").update(t).digest("hex").slice(0,16)}function u(t){try{return h("git rev-parse --show-toplevel",{cwd:t,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim()||null}catch{return null}}function w(t){let r=u(t)||t;return`claudecode_project_${l(r)}`}function L(t){return(u(t)||t).split("/").pop()||"unknown"}function M(){try{let e=h("git config user.email",{encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();if(e)return`claudecode_user_${l(e)}`}catch{}let t=process.env.USER||process.env.USERNAME||"anonymous";return`claudecode_user_${l(t)}`}f.exports={sha256:l,getGitRoot:u,getContainerTag:w,getProjectName:L,getUserContainerTag:M}});var{LocalMemoryDB:C}=N(),{getContainerTag:F,getProjectName:U}=I();async function b(){let t=process.argv.slice(2).join(" ");if(!t||!t.trim()){console.log("No search query provided. Please specify what you want to search for.");return}let e=process.cwd(),r=F(e),a=U(e);try{let s=new C,i=s.getProfile(r,t);if(console.log(`## Memory Search: "${t}"`),console.log(`Project: ${a}
`),i.profile&&(i.profile.static?.length>0&&(console.log("### User Preferences"),i.profile.static.forEach(o=>console.log(`- ${o}`)),console.log("")),i.profile.dynamic?.length>0&&(console.log("### Recent Context"),i.profile.dynamic.forEach(o=>console.log(`- ${o}`)),console.log(""))),i.searchResults?.results?.length>0)console.log("### Relevant Memories"),i.searchResults.results.forEach((o,n)=>{let m=Math.round(o.similarity*100),c=o.memory||o.content||"";console.log(`
**Memory ${n+1}** (${m}% match)`),console.log(c.slice(0,500))});else{let o=s.search(t,r,{limit:10});o.results?.length>0?(console.log("### Relevant Memories"),o.results.forEach((n,m)=>{let c=Math.round(n.similarity*100),_=n.memory||n.content||"";console.log(`
**Memory ${m+1}** (${c}% match)`),console.log(_.slice(0,500))})):(console.log("No memories found matching your query."),console.log("Memories are automatically saved as you work in this project."))}}catch(s){console.log(`Error searching memories: ${s.message}`)}}b().catch(t=>{console.error(`Fatal error: ${t.message}`),process.exit(1)});
