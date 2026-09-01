import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = [
  path.join(root, 'README.md'),
  path.join(root, 'CONTRIBUTING.md'),
  path.join(root, 'SECURITY.md'),
  path.join(root, 'AGENTS.md'),
  path.join(root, 'docs'),
  path.join(root, 'tests', 'e2e', 'README.md'),
];

function collect(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.md') ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    collect(path.join(target, entry.name))
  );
}

const failures = [];
const linkPattern = /!?\[[^\]\r\n]*\]\(([^)\r\n]+)\)/g;

for (const file of scanRoots.flatMap(collect)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    const target = rawTarget.split(/\s+["']/)[0];
    if (!target || target.startsWith('#')) continue;
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(target)) continue;

    const withoutAnchor = target.split('#')[0].split('?')[0];
    if (!withoutAnchor) continue;

    let decoded;
    try {
      decoded = decodeURIComponent(withoutAnchor);
    } catch {
      failures.push(path.relative(root, file) + ': invalid encoded link ' + target);
      continue;
    }

    const resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) {
      failures.push(path.relative(root, file) + ' -> ' + target);
    }
  }
}

if (failures.length) {
  console.error('Documentation link check failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('Documentation link check passed.');
