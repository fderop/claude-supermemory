#!/usr/bin/env node
var l=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var L=l((ge,A)=>{var H=require("better-sqlite3"),w=require("node:fs"),D=require("node:path"),Y=require("node:os"),N=D.join(Y.homedir(),".claude-memory"),J=D.join(N,"memories.db");function W(){w.existsSync(N)||w.mkdirSync(N,{recursive:!0})}var R=class{constructor(){W(),this.db=new H(J),this.db.pragma("journal_mode = WAL"),this._migrate()}_migrate(){this.db.exec(`
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
    `)}addMemory(e,n,o={},s=null){let c=JSON.stringify({sm_source:"claude-code-plugin",...o});if(s){let r=this.db.prepare("SELECT id FROM memories WHERE container = ? AND custom_id = ?").get(n,s);if(r)return this.db.prepare("UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?").run(e,c,r.id),{id:r.id,status:"updated",containerTag:n}}return{id:this.db.prepare("INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)").run(e,n,c,s).lastInsertRowid,status:"created",containerTag:n}}search(e,n,o={}){let s=o.limit||10,c=e.replace(/['"]/g," ").trim();if(!c)return{results:[],total:0,timing:0};let i=Date.now(),r=this.db.prepare(`SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`).all(c,n,s),a=Date.now()-i;return{results:r.map(u=>({id:u.id,memory:u.content,similarity:1/(1+Math.abs(u.rank)),content:u.content,updatedAt:u.updated_at})),total:r.length,timing:a}}getProfile(e,n){let s=this.db.prepare("SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5").all(e).map(i=>{let r=i.content.split(`
`)[0];return r.length>200?`${r.slice(0,200)}...`:r}),c;if(n){let i=this.search(n,e,{limit:10});c={results:i.results,total:i.total,timing:i.timing}}return{profile:{static:s,dynamic:[]},searchResults:c}}listMemories(e,n=20){return{memories:this.db.prepare("SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?").all(e,n).map(s=>({id:s.id,content:s.content,metadata:JSON.parse(s.metadata||"{}"),createdAt:s.created_at,updatedAt:s.updated_at}))}}deleteMemory(e){return this.db.prepare("DELETE FROM memories WHERE id = ?").run(e),{deleted:!0}}close(){this.db.close()}};A.exports={LocalMemoryDB:R}});var x=l((Ne,F)=>{var{execSync:$}=require("node:child_process"),V=require("node:crypto");function T(t){return V.createHash("sha256").update(t).digest("hex").slice(0,16)}function I(t){try{return $("git rev-parse --show-toplevel",{cwd:t,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim()||null}catch{return null}}function z(t){let n=I(t)||t;return`claudecode_project_${T(n)}`}function K(t){return(I(t)||t).split("/").pop()||"unknown"}function Q(){try{let e=$("git config user.email",{encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();if(e)return`claudecode_user_${T(e)}`}catch{}let t=process.env.USER||process.env.USERNAME||"anonymous";return`claudecode_user_${T(t)}`}F.exports={sha256:T,getGitRoot:I,getContainerTag:z,getProjectName:K,getUserContainerTag:Q}});var U=l((Re,M)=>{var p=require("node:fs"),b=require("node:path"),Z=require("node:os"),S=b.join(Z.homedir(),".claude-memory"),E=b.join(S,"settings.json"),C={maxProfileItems:5,debug:!1};function ee(){p.existsSync(S)||p.mkdirSync(S,{recursive:!0})}function te(){let t={...C};try{if(p.existsSync(E)){let e=p.readFileSync(E,"utf-8");Object.assign(t,JSON.parse(e))}}catch(e){console.error(`Settings: Failed to load ${E}: ${e.message}`)}return process.env.CLAUDE_MEMORY_DEBUG==="true"&&(t.debug=!0),t}function ne(t){ee(),p.writeFileSync(E,JSON.stringify(t,null,2))}function oe(t,e,n){if(t.debug){let o=new Date().toISOString();console.error(n?`[${o}] ${e}: ${JSON.stringify(n)}`:`[${o}] ${e}`)}}M.exports={SETTINGS_DIR:S,SETTINGS_FILE:E,DEFAULT_SETTINGS:C,loadSettings:te,saveSettings:ne,debugLog:oe}});var X=l((Ie,v)=>{async function re(){return new Promise((t,e)=>{let n="";process.stdin.setEncoding("utf8"),process.stdin.on("data",o=>{n+=o}),process.stdin.on("end",()=>{try{t(n.trim()?JSON.parse(n):{})}catch(o){e(new Error(`Failed to parse stdin JSON: ${o.message}`))}}),process.stdin.on("error",e),process.stdin.isTTY&&t({})})}function h(t){console.log(JSON.stringify(t))}function se(t=null){h(t?{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:t}}:{continue:!0,suppressOutput:!0})}function ie(t){console.error(`Memory: ${t}`),h({continue:!0,suppressOutput:!0})}v.exports={readStdin:re,writeOutput:h,outputSuccess:se,outputError:ie}});var G=l((_e,q)=>{function k(t){try{let e=new Date(t),n=new Date,o=(n.getTime()-e.getTime())/1e3,s=o/60,c=o/3600,i=o/86400;if(s<30)return"just now";if(s<60)return`${Math.floor(s)}mins ago`;if(c<24)return`${Math.floor(c)}hrs ago`;if(i<7)return`${Math.floor(i)}d ago`;let r=e.toLocaleString("en",{month:"short"});return e.getFullYear()===n.getFullYear()?`${e.getDate()} ${r}`:`${e.getDate()} ${r}, ${e.getFullYear()}`}catch{return""}}function j(t,e,n){let o=new Set,s=t.filter(r=>o.has(r)?!1:(o.add(r),!0)),c=e.filter(r=>o.has(r)?!1:(o.add(r),!0)),i=n.filter(r=>{let a=r.memory??"";return!a||o.has(a)?!1:(o.add(a),!0)});return{static:s,dynamic:c,searchResults:i}}function ce(t,e=!0,n=!1,o=10){if(!t)return null;let s=t.profile?.static||[],c=t.profile?.dynamic||[],i=t.searchResults?.results||[],r=j(e?s:[],e?c:[],n?i:[]),a=r.static.slice(0,o),u=r.dynamic.slice(0,o),g=r.searchResults.slice(0,o);if(a.length===0&&u.length===0&&g.length===0)return null;let f=[];if(a.length>0&&f.push(`## User Profile (Persistent)
`+a.map(m=>`- ${m}`).join(`
`)),u.length>0&&f.push(`## Recent Context
`+u.map(m=>`- ${m}`).join(`
`)),g.length>0){let m=g.map(d=>{let P=d.memory??"",O=d.updatedAt?k(d.updatedAt):"",B=d.similarity!=null?`[${Math.round(d.similarity*100)}%]`:"";return`- ${O?`[${O}] `:""}${P} ${B}`.trim()});f.push(`## Relevant Memories (with relevance %)
`+m.join(`
`))}return`<supermemory-context>
The following is recalled context about the user. Reference it only when relevant to the conversation.

${f.join(`

`)}

Use these memories naturally when relevant \u2014 including indirect connections \u2014 but don't force them into every response or make assumptions beyond what's stated.
</supermemory-context>`}q.exports={formatContext:ce,formatRelativeTime:k,deduplicateMemories:j}});var{LocalMemoryDB:ae}=L(),{getContainerTag:ue,getProjectName:me}=x(),{loadSettings:de,debugLog:_}=U(),{readStdin:le,writeOutput:y}=X(),{formatContext:Ee}=G();async function pe(){let t=de();try{let n=(await le()).cwd||process.cwd(),o=ue(n),s=me(n);_(t,"SessionStart",{cwd:n,containerTag:o,projectName:s});let i=new ae().getProfile(o,s),r=Ee(i,!0,!1,t.maxProfileItems);if(!r){y({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:`<supermemory-context>
No previous memories found for this project.
Memories will be saved as you work.
</supermemory-context>`}});return}_(t,"Context generated",{length:r.length}),y({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:r}})}catch(e){_(t,"Error",{error:e.message}),console.error(`Memory: ${e.message}`),y({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:`<supermemory-status>
Failed to load memories: ${e.message}
Session will continue without memory context.
</supermemory-status>`}})}}pe().catch(t=>{console.error(`Memory fatal: ${t.message}`),process.exit(1)});
