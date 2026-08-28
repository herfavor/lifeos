import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');

const processDocPattern = /(?:^|[-_.])(audit|implementation|progress|status|handoff|complete|completion|phase[-_.]?\d+|wave[-_.]?\d+)(?:[-_.]|$)/i;
const processCommentPattern = /\b(?:phase\s+\d+(?:\.\d+|[a-z])?|wave\s+\d+[a-z]?|p[012](?:\s*#\d+)?|\d+%\s*parity|final\s+polish)\b/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const failures = [];

for (const base of [root, path.join(root, 'docs')]) {
  if (!fs.existsSync(base)) continue;
  for (const file of fs.readdirSync(base, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.md')) continue;
    if (processDocPattern.test(file.name)) {
      failures.push(`process document: ${path.relative(root, path.join(base, file.name))}`);
    }
  }
}

if (fs.existsSync(sourceRoot)) {
  for (const file of walk(sourceRoot).filter((file) => /\.(?:ts|tsx)$/.test(file))) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const commentStart = line.search(/\/\/|\/\*|\*\/|^\s*\*|\{\/\*/);
      if (commentStart < 0) return;
      const comment = line.slice(commentStart);
      if (processCommentPattern.test(comment)) {
        failures.push(`${path.relative(root, file)}:${index + 1}: ${comment.trim()}`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error('Repository hygiene check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Repository hygiene check passed.');
