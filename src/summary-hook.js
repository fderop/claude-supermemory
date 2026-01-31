const { LocalMemoryDB } = require('./lib/local-db');
const { getContainerTag, getProjectName } = require('./lib/container-tag');
const { loadSettings, debugLog } = require('./lib/settings');
const { readStdin, writeOutput } = require('./lib/stdin');
const { formatNewEntries } = require('./lib/transcript-formatter');

async function main() {
  const settings = loadSettings();

  try {
    const input = await readStdin();
    const cwd = input.cwd || process.cwd();
    const sessionId = input.session_id;
    const transcriptPath = input.transcript_path;

    debugLog(settings, 'Stop', { sessionId, transcriptPath });

    if (!transcriptPath || !sessionId) {
      debugLog(settings, 'Missing transcript path or session id');
      writeOutput({ continue: true });
      return;
    }

    const formatted = formatNewEntries(transcriptPath, sessionId);

    if (!formatted) {
      debugLog(settings, 'No new content to save');
      writeOutput({ continue: true });
      return;
    }

    const db = new LocalMemoryDB();
    const containerTag = getContainerTag(cwd);
    const projectName = getProjectName(cwd);

    db.addMemory(
      formatted,
      containerTag,
      {
        type: 'session_turn',
        project: projectName,
        timestamp: new Date().toISOString(),
      },
      sessionId,
    );

    debugLog(settings, 'Session turn saved', { length: formatted.length });
    writeOutput({ continue: true });
  } catch (err) {
    debugLog(settings, 'Error', { error: err.message });
    console.error(`Memory: ${err.message}`);
    writeOutput({ continue: true });
  }
}

main().catch((err) => {
  console.error(`Memory fatal: ${err.message}`);
  process.exit(1);
});
