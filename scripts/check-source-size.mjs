import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const maxLines = 1200;

// Existing hotspots are allowed temporarily. The list may only shrink.
const legacyAllowlist = new Set([
  'src/components/AITerminal.tsx',
  'src/components/CommandPalette/searchRegistry.ts',
  'src/pages/Habits.tsx',
  'src/pages/LinkLibrary.tsx',
  'src/services/ai/agent/executor.ts',
  'src/stores/useKanbanStore.ts',
  'src/stores/useNotesStore.ts',
  'src/stores/useTimeTrackingStore.ts',
  'src/widgets/NotesEditor.tsx',
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const failures = [];
for (const file of walk(sourceRoot).filter((file) => /\.(?:ts|tsx)$/.test(file))) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
  if (lines > maxLines && !legacyAllowlist.has(relative)) {
    failures.push(`${relative}: ${lines} lines (limit ${maxLines})`);
  }
}

if (failures.length > 0) {
  console.error('Source size check failed. Split new/expanded hotspots instead of adding another god file:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source size check passed (limit: ${maxLines} lines; legacy allowlist: ${legacyAllowlist.size}).`);
