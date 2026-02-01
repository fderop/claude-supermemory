#!/usr/bin/env node
var d=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var U=d((At,F)=>{var K=require("better-sqlite3"),L=require("node:fs"),D=require("node:path"),z=require("node:os"),R=D.join(z.homedir(),".claude-memory"),Q=D.join(R,"memories.db");function Z(){L.existsSync(R)||L.mkdirSync(R,{recursive:!0})}var y=class{constructor(){Z(),this.db=new K(Q),this.db.pragma("journal_mode = WAL"),this._migrate()}_migrate(){this.db.exec(`
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
    `)}addMemory(e,n,s={},r=null){let o=JSON.stringify({sm_source:"claude-code-plugin",...s});if(r){let i=this.db.prepare("SELECT id FROM memories WHERE container = ? AND custom_id = ?").get(n,r);if(i)return this.db.prepare("UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?").run(e,o,i.id),{id:i.id,status:"updated",containerTag:n}}return{id:this.db.prepare("INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)").run(e,n,o,r).lastInsertRowid,status:"created",containerTag:n}}search(e,n,s={}){let r=s.limit||10,o=e.replace(/['"]/g," ").trim();if(!o)return{results:[],total:0,timing:0};let c=Date.now(),i=this.db.prepare(`SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`).all(o,n,r),a=Date.now()-c;return{results:i.map(u=>({id:u.id,memory:u.content,similarity:1/(1+Math.abs(u.rank)),content:u.content,updatedAt:u.updated_at})),total:i.length,timing:a}}getProfile(e,n){let r=this.db.prepare("SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5").all(e).map(c=>{let i=c.content.split(`
`)[0];return i.length>200?`${i.slice(0,200)}...`:i}),o;if(n){let c=this.search(n,e,{limit:10});o={results:c.results,total:c.total,timing:c.timing}}return{profile:{static:r,dynamic:[]},searchResults:o}}listMemories(e,n=20){return{memories:this.db.prepare("SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?").all(e,n).map(r=>({id:r.id,content:r.content,metadata:JSON.parse(r.metadata||"{}"),createdAt:r.created_at,updatedAt:r.updated_at}))}}deleteMemory(e){return this.db.prepare("DELETE FROM memories WHERE id = ?").run(e),{deleted:!0}}close(){this.db.close()}};F.exports={LocalMemoryDB:y}});var b=d((Lt,$)=>{var{execSync:M}=require("node:child_process"),tt=require("node:crypto");function T(t){return tt.createHash("sha256").update(t).digest("hex").slice(0,16)}function I(t){try{return M("git rev-parse --show-toplevel",{cwd:t,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim()||null}catch{return null}}function et(t){let n=I(t)||t;return`claudecode_project_${T(n)}`}function nt(t){return(I(t)||t).split("/").pop()||"unknown"}function st(){try{let e=M("git config user.email",{encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();if(e)return`claudecode_user_${T(e)}`}catch{}let t=process.env.USER||process.env.USERNAME||"anonymous";return`claudecode_user_${T(t)}`}$.exports={sha256:T,getGitRoot:I,getContainerTag:et,getProjectName:nt,getUserContainerTag:st}});var k=d((Dt,j)=>{var p=require("node:fs"),C=require("node:path"),rt=require("node:os"),S=C.join(rt.homedir(),".claude-memory"),l=C.join(S,"settings.json"),x={maxProfileItems:5,debug:!1};function ot(){p.existsSync(S)||p.mkdirSync(S,{recursive:!0})}function it(){let t={...x};try{if(p.existsSync(l)){let e=p.readFileSync(l,"utf-8");Object.assign(t,JSON.parse(e))}}catch(e){console.error(`Settings: Failed to load ${l}: ${e.message}`)}return process.env.CLAUDE_MEMORY_DEBUG==="true"&&(t.debug=!0),t}function ct(t){ot(),p.writeFileSync(l,JSON.stringify(t,null,2))}function at(t,e,n){if(t.debug){let s=new Date().toISOString();console.error(n?`[${s}] ${e}: ${JSON.stringify(n)}`:`[${s}] ${e}`)}}j.exports={SETTINGS_DIR:S,SETTINGS_FILE:l,DEFAULT_SETTINGS:x,loadSettings:it,saveSettings:ct,debugLog:at}});var G=d((Ft,X)=>{async function ut(){return new Promise((t,e)=>{let n="";process.stdin.setEncoding("utf8"),process.stdin.on("data",s=>{n+=s}),process.stdin.on("end",()=>{try{t(n.trim()?JSON.parse(n):{})}catch(s){e(new Error(`Failed to parse stdin JSON: ${s.message}`))}}),process.stdin.on("error",e),process.stdin.isTTY&&t({})})}function g(t){console.log(JSON.stringify(t))}function mt(t=null){g(t?{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:t}}:{continue:!0,suppressOutput:!0})}function dt(t){console.error(`Memory: ${t}`),g({continue:!0,suppressOutput:!0})}X.exports={readStdin:ut,writeOutput:g,outputSuccess:mt,outputError:dt}});var Y=d((Ut,W)=>{var m=require("node:fs"),h=require("node:path"),lt=require("node:os"),pt=500,ft=["Read"],N=h.join(lt.homedir(),".claude-memory","trackers"),O=new Map;function q(){m.existsSync(N)||m.mkdirSync(N,{recursive:!0})}function P(t){q();let e=h.join(N,`${t}.txt`);return m.existsSync(e)?m.readFileSync(e,"utf-8").trim():null}function v(t,e){q();let n=h.join(N,`${t}.txt`);m.writeFileSync(n,e)}function B(t){if(!m.existsSync(t))return[];let n=m.readFileSync(t,"utf-8").trim().split(`
`),s=[];for(let r of n)if(r.trim())try{s.push(JSON.parse(r))}catch{}return s}function H(t,e){if(!e)return t.filter(r=>r.type==="user"||r.type==="assistant");let n=!1,s=[];for(let r of t){if(r.uuid===e){n=!0;continue}n&&(r.type==="user"||r.type==="assistant")&&s.push(r)}return s}function J(t){let e=[];if(t.type==="user"){let n=Et(t.message);n&&e.push(n)}else if(t.type==="assistant"){let n=Tt(t.message);n&&e.push(n)}return e.join(`
`)}function Et(t){if(!t?.content)return null;let e=t.content,n=[];if(typeof e=="string"){let s=f(e);s&&n.push(`[role:user]
${s}
[user:end]`)}else if(Array.isArray(e)){for(let s of e)if(s.type==="text"&&s.text){let r=f(s.text);r&&n.push(`[role:user]
${r}
[user:end]`)}else if(s.type==="tool_result"){let r=s.tool_use_id||"",o=O.get(r)||"Unknown";if(ft.includes(o))continue;let c=w(f(s.content||""),pt),i=s.is_error?"error":"success";c&&n.push(`[tool_result:${o} status="${i}"]
${c}
[tool_result:end]`)}}return n.length>0?n.join(`

`):null}function Tt(t){if(!t?.content)return null;let e=t.content,n=[];if(!Array.isArray(e))return null;for(let s of e)if(s.type!=="thinking"){if(s.type==="text"&&s.text){let r=f(s.text);r&&n.push(`[role:assistant]
${r}
[assistant:end]`)}else if(s.type==="tool_use"){let r=s.name||"Unknown",o=s.id||"",c=s.input||{},i=St(c);n.push(`[tool:${r}]
${i}
[tool:end]`),o&&O.set(o,r)}}return n.length>0?n.join(`

`):null}function St(t){let e=[];for(let[n,s]of Object.entries(t)){let r=typeof s=="string"?s:JSON.stringify(s);r=w(r,200),e.push(`${n}: ${r}`)}return e.join(`
`)}function f(t){return!t||typeof t!="string"?"":t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,"").replace(/<supermemory-context>[\s\S]*?<\/supermemory-context>/g,"").trim()}function w(t,e){return!t||t.length<=e?t:`${t.slice(0,e)}...`}function gt(t,e){O=new Map;let n=B(t);if(n.length===0)return null;let s=P(e),r=H(n,s);if(r.length===0)return null;let o=r[0],c=r[r.length-1],i=o.timestamp||new Date().toISOString(),a=[];a.push(`[turn:start timestamp="${i}"]`);for(let V of r){let A=J(V);A&&a.push(A)}a.push("[turn:end]");let u=a.join(`

`);return u.length<100?null:(v(e,c.uuid),u)}W.exports={parseTranscript:B,getEntriesSinceLastCapture:H,formatEntry:J,formatNewEntries:gt,cleanContent:f,truncate:w,getLastCapturedUuid:P,setLastCapturedUuid:v}});var{LocalMemoryDB:Nt}=U(),{getContainerTag:_t,getProjectName:Rt}=b(),{loadSettings:yt,debugLog:E}=k(),{readStdin:It,writeOutput:_}=G(),{formatNewEntries:ht}=Y();async function Ot(){let t=yt();try{let e=await It(),n=e.cwd||process.cwd(),s=e.session_id,r=e.transcript_path;if(E(t,"Stop",{sessionId:s,transcriptPath:r}),!r||!s){E(t,"Missing transcript path or session id"),_({continue:!0});return}let o=ht(r,s);if(!o){E(t,"No new content to save"),_({continue:!0});return}let c=new Nt,i=_t(n),a=Rt(n);c.addMemory(o,i,{type:"session_turn",project:a,timestamp:new Date().toISOString()},s),E(t,"Session turn saved",{length:o.length}),_({continue:!0})}catch(e){E(t,"Error",{error:e.message}),console.error(`Memory: ${e.message}`),_({continue:!0})}}Ot().catch(t=>{console.error(`Memory fatal: ${t.message}`),process.exit(1)});
