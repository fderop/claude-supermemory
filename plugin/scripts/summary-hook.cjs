#!/usr/bin/env node
var m=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports);var M=m((wt,U)=>{var K=require("better-sqlite3"),w=require("node:fs"),D=require("node:path"),z=require("node:os"),R=D.join(z.homedir(),".claude-memory"),Q=D.join(R,"memories.db");function Z(){w.existsSync(R)||w.mkdirSync(R,{recursive:!0})}var h=class{constructor(){Z(),this.db=new K(Q),this.db.pragma("journal_mode = WAL"),this._migrate()}_migrate(){this.db.exec(`
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
    `)}addMemory(e,n,r={},s=null){let o=JSON.stringify({sm_source:"claude-code-plugin",...r});if(s){let i=this.db.prepare("SELECT id FROM memories WHERE container = ? AND custom_id = ?").get(n,s);if(i)return this.db.prepare("UPDATE memories SET content = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?").run(e,o,i.id),{id:i.id,status:"updated",containerTag:n}}return{id:this.db.prepare("INSERT INTO memories (content, container, metadata, custom_id) VALUES (?, ?, ?, ?)").run(e,n,o,s).lastInsertRowid,status:"created",containerTag:n}}search(e,n,r={}){let s=r.limit||10,o=e.replace(/['"]/g," ").trim();if(!o)return{results:[],total:0,timing:0};let c=Date.now(),i=this.db.prepare(`SELECT m.id, m.content, m.metadata, m.updated_at,
                rank
         FROM memories_fts f
         JOIN memories m ON m.id = f.rowid
         WHERE memories_fts MATCH ? AND m.container = ?
         ORDER BY rank
         LIMIT ?`).all(o,n,s),u=Date.now()-c;return{results:i.map(a=>({id:a.id,memory:a.content,similarity:1/(1+Math.abs(a.rank)),content:a.content,updatedAt:a.updated_at})),total:i.length,timing:u}}getProfile(e,n){let s=this.db.prepare("SELECT content FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT 5").all(e).map(c=>{let i=c.content.split(`
`)[0];return i.length>200?`${i.slice(0,200)}...`:i}),o;if(n){let c=this.search(n,e,{limit:10});o={results:c.results,total:c.total,timing:c.timing}}return{profile:{static:s,dynamic:[]},searchResults:o}}listMemories(e,n=20){return{memories:this.db.prepare("SELECT * FROM memories WHERE container = ? ORDER BY created_at DESC LIMIT ?").all(e,n).map(s=>({id:s.id,content:s.content,metadata:JSON.parse(s.metadata||"{}"),createdAt:s.created_at,updatedAt:s.updated_at}))}}deleteMemory(e){return this.db.prepare("DELETE FROM memories WHERE id = ?").run(e),{deleted:!0}}close(){this.db.close()}};U.exports={LocalMemoryDB:h}});var b=m((Dt,C)=>{var{execSync:F}=require("node:child_process"),tt=require("node:crypto");function T(t){return tt.createHash("sha256").update(t).digest("hex").slice(0,16)}function I(t){try{return F("git rev-parse --show-toplevel",{cwd:t,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim()||null}catch{return null}}function et(t){let n=I(t)||t;return`claudecode_project_${T(n)}`}function nt(t){return(I(t)||t).split("/").pop()||"unknown"}function rt(){try{let e=F("git config user.email",{encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();if(e)return`claudecode_user_${T(e)}`}catch{}let t=process.env.USER||process.env.USERNAME||"anonymous";return`claudecode_user_${T(t)}`}C.exports={sha256:T,getGitRoot:I,getContainerTag:et,getProjectName:nt,getUserContainerTag:rt}});var j=m((Ut,x)=>{var p=require("node:fs"),$=require("node:path"),st=require("node:os"),S=$.join(st.homedir(),".claude-memory"),l=$.join(S,"settings.json"),k={skipTools:["Read","Glob","Grep","TodoWrite","AskUserQuestion"],captureTools:["Edit","Write","Bash","Task"],maxProfileItems:5,debug:!1,injectProfile:!0};function ot(){p.existsSync(S)||p.mkdirSync(S,{recursive:!0})}function it(){let t={...k};try{if(p.existsSync(l)){let e=p.readFileSync(l,"utf-8");Object.assign(t,JSON.parse(e))}}catch(e){console.error(`Settings: Failed to load ${l}: ${e.message}`)}return process.env.CLAUDE_MEMORY_SKIP_TOOLS&&(t.skipTools=process.env.CLAUDE_MEMORY_SKIP_TOOLS.split(",").map(e=>e.trim())),process.env.CLAUDE_MEMORY_DEBUG==="true"&&(t.debug=!0),t}function ct(t){ot(),p.writeFileSync(l,JSON.stringify(t,null,2))}function ut(t,e){return e.skipTools.includes(t)?!1:e.captureTools&&e.captureTools.length>0?e.captureTools.includes(t):!0}function at(t,e,n){if(t.debug){let r=new Date().toISOString();console.error(n?`[${r}] ${e}: ${JSON.stringify(n)}`:`[${r}] ${e}`)}}x.exports={SETTINGS_DIR:S,SETTINGS_FILE:l,DEFAULT_SETTINGS:k,loadSettings:it,saveSettings:ct,shouldCaptureTool:ut,debugLog:at}});var G=m((Mt,X)=>{async function dt(){return new Promise((t,e)=>{let n="";process.stdin.setEncoding("utf8"),process.stdin.on("data",r=>{n+=r}),process.stdin.on("end",()=>{try{t(n.trim()?JSON.parse(n):{})}catch(r){e(new Error(`Failed to parse stdin JSON: ${r.message}`))}}),process.stdin.on("error",e),process.stdin.isTTY&&t({})})}function g(t){console.log(JSON.stringify(t))}function mt(t=null){g(t?{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:t}}:{continue:!0,suppressOutput:!0})}function lt(t){console.error(`Memory: ${t}`),g({continue:!0,suppressOutput:!0})}X.exports={readStdin:dt,writeOutput:g,outputSuccess:mt,outputError:lt}});var Y=m((Ft,W)=>{var d=require("node:fs"),y=require("node:path"),pt=require("node:os"),ft=500,Et=["Read"],_=y.join(pt.homedir(),".claude-memory","trackers"),O=new Map;function P(){d.existsSync(_)||d.mkdirSync(_,{recursive:!0})}function q(t){P();let e=y.join(_,`${t}.txt`);return d.existsSync(e)?d.readFileSync(e,"utf-8").trim():null}function v(t,e){P();let n=y.join(_,`${t}.txt`);d.writeFileSync(n,e)}function B(t){if(!d.existsSync(t))return[];let n=d.readFileSync(t,"utf-8").trim().split(`
`),r=[];for(let s of n)if(s.trim())try{r.push(JSON.parse(s))}catch{}return r}function H(t,e){if(!e)return t.filter(s=>s.type==="user"||s.type==="assistant");let n=!1,r=[];for(let s of t){if(s.uuid===e){n=!0;continue}n&&(s.type==="user"||s.type==="assistant")&&r.push(s)}return r}function J(t){let e=[];if(t.type==="user"){let n=Tt(t.message);n&&e.push(n)}else if(t.type==="assistant"){let n=St(t.message);n&&e.push(n)}return e.join(`
`)}function Tt(t){if(!t?.content)return null;let e=t.content,n=[];if(typeof e=="string"){let r=f(e);r&&n.push(`[role:user]
${r}
[user:end]`)}else if(Array.isArray(e)){for(let r of e)if(r.type==="text"&&r.text){let s=f(r.text);s&&n.push(`[role:user]
${s}
[user:end]`)}else if(r.type==="tool_result"){let s=r.tool_use_id||"",o=O.get(s)||"Unknown";if(Et.includes(o))continue;let c=A(f(r.content||""),ft),i=r.is_error?"error":"success";c&&n.push(`[tool_result:${o} status="${i}"]
${c}
[tool_result:end]`)}}return n.length>0?n.join(`

`):null}function St(t){if(!t?.content)return null;let e=t.content,n=[];if(!Array.isArray(e))return null;for(let r of e)if(r.type!=="thinking"){if(r.type==="text"&&r.text){let s=f(r.text);s&&n.push(`[role:assistant]
${s}
[assistant:end]`)}else if(r.type==="tool_use"){let s=r.name||"Unknown",o=r.id||"",c=r.input||{},i=gt(c);n.push(`[tool:${s}]
${i}
[tool:end]`),o&&O.set(o,s)}}return n.length>0?n.join(`

`):null}function gt(t){let e=[];for(let[n,r]of Object.entries(t)){let s=typeof r=="string"?r:JSON.stringify(r);s=A(s,200),e.push(`${n}: ${s}`)}return e.join(`
`)}function f(t){return!t||typeof t!="string"?"":t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,"").replace(/<supermemory-context>[\s\S]*?<\/supermemory-context>/g,"").trim()}function A(t,e){return!t||t.length<=e?t:`${t.slice(0,e)}...`}function _t(t,e){O=new Map;let n=B(t);if(n.length===0)return null;let r=q(e),s=H(n,r);if(s.length===0)return null;let o=s[0],c=s[s.length-1],i=o.timestamp||new Date().toISOString(),u=[];u.push(`[turn:start timestamp="${i}"]`);for(let V of s){let L=J(V);L&&u.push(L)}u.push("[turn:end]");let a=u.join(`

`);return a.length<100?null:(v(e,c.uuid),a)}W.exports={parseTranscript:B,getEntriesSinceLastCapture:H,formatEntry:J,formatNewEntries:_t,cleanContent:f,truncate:A,getLastCapturedUuid:q,setLastCapturedUuid:v}});var{LocalMemoryDB:Nt}=M(),{getContainerTag:Rt,getProjectName:ht}=b(),{loadSettings:It,debugLog:E}=j(),{readStdin:yt,writeOutput:N}=G(),{formatNewEntries:Ot}=Y();async function At(){let t=It();try{let e=await yt(),n=e.cwd||process.cwd(),r=e.session_id,s=e.transcript_path;if(E(t,"Stop",{sessionId:r,transcriptPath:s}),!s||!r){E(t,"Missing transcript path or session id"),N({continue:!0});return}let o=Ot(s,r);if(!o){E(t,"No new content to save"),N({continue:!0});return}let c=new Nt,i=Rt(n),u=ht(n);c.addMemory(o,i,{type:"session_turn",project:u,timestamp:new Date().toISOString()},r),E(t,"Session turn saved",{length:o.length}),N({continue:!0})}catch(e){E(t,"Error",{error:e.message}),console.error(`Memory: ${e.message}`),N({continue:!0})}}At().catch(t=>{console.error(`Memory fatal: ${t.message}`),process.exit(1)});
