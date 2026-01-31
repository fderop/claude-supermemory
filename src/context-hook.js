const { LocalMemoryDB } = require('./lib/local-db');
const { getContainerTag, getProjectName } = require('./lib/container-tag');
const { loadSettings, debugLog } = require('./lib/settings');
const { readStdin, writeOutput } = require('./lib/stdin');
const { formatContext } = require('./lib/format-context');

async function main() {
  const settings = loadSettings();

  try {
    const input = await readStdin();
    const cwd = input.cwd || process.cwd();
    const containerTag = getContainerTag(cwd);
    const projectName = getProjectName(cwd);

    debugLog(settings, 'SessionStart', { cwd, containerTag, projectName });

    const db = new LocalMemoryDB();
    const profileResult = db.getProfile(containerTag, projectName);

    const additionalContext = formatContext(
      profileResult,
      true,
      false,
      settings.maxProfileItems,
    );

    if (!additionalContext) {
      writeOutput({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: `<supermemory-context>
No previous memories found for this project.
Memories will be saved as you work.
</supermemory-context>`,
        },
      });
      return;
    }

    debugLog(settings, 'Context generated', {
      length: additionalContext.length,
    });

    writeOutput({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
    });
  } catch (err) {
    debugLog(settings, 'Error', { error: err.message });
    console.error(`Memory: ${err.message}`);
    writeOutput({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `<supermemory-status>
Failed to load memories: ${err.message}
Session will continue without memory context.
</supermemory-status>`,
      },
    });
  }
}

main().catch((err) => {
  console.error(`Memory fatal: ${err.message}`);
  process.exit(1);
});
