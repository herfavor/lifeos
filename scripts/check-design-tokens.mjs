import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const sourceRoot = new URL('../src/', import.meta.url);
const allowedExtensions = new Set(['.ts', '.tsx', '.css']);
const legacyToken = /(?:primary-cyan|bg-bg-|(?:text|bg|border|ring)-primary-(?:light|dark)|border-border-primary|text-text-primary|text-text-dark-muted|text-dark-background|accent-primary-dark|surface-(?:hover-(?:light|dark)|(?:light|dark)-(?:hover|tertiary|base|primary))|(?:bg|text|border|ring)-surface-(?:elevated|base|hover)|text-text-(?:secondary|tertiary)|status-(?:error|warning)-hover)/g;
const failures = [];

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      await walk(new URL(`${entry.name}/`, directoryUrl));
      continue;
    }
    if (!allowedExtensions.has(extname(entry.name))) continue;
    const source = await readFile(entryUrl, 'utf8');
    source.split('\n').forEach((line, index) => {
      const matches = [...line.matchAll(legacyToken)];
      for (const match of matches) {
        failures.push(`${relative(new URL('..', sourceRoot).pathname, entryUrl.pathname)}:${index + 1} ${match[0]}`);
      }
    });
  }
}

await walk(sourceRoot);

if (failures.length > 0) {
  console.error('Legacy design tokens found:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Design token check passed.');
}
