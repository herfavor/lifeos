#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(repositoryRoot, 'tests', 'e2e');
const requireCritical = process.argv.includes('--require-critical');
const requiredCriticalFiles = [
  'accessibility.spec.ts',
  'automation-engine.spec.ts',
  'automation-rules.spec.ts',
  'backup-restore.spec.ts',
  'cross-feature-integration.spec.ts',
  'data-persistence.spec.ts',
  'performance.spec.ts',
  'persistence-flows.spec.ts',
  'responsive.spec.ts',
  'visual-regression.spec.ts',
];

const specFiles = fs.readdirSync(testRoot)
  .filter((name) => name.endsWith('.spec.ts'))
  .sort();
const missingFiles = requiredCriticalFiles.filter((name) => !specFiles.includes(name));
const onlySites = [];
const skipSites = [];
let testDeclarations = 0;
let describeBlocks = 0;

for (const fileName of specFiles) {
  const source = fs.readFileSync(path.join(testRoot, fileName), 'utf8');
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (/^\s*test(?:\.(?:skip|fixme))?\s*\(/.test(line)) testDeclarations += 1;
    if (/^\s*test\.describe(?:\.serial)?\s*\(/.test(line)) describeBlocks += 1;
    if (/test\.(?:only)|describe\.only/.test(line)) {
      onlySites.push(`${fileName}:${index + 1}`);
    }
    if (/test\.(?:skip|fixme)\s*\(/.test(line)) {
      skipSites.push(`${fileName}:${index + 1} ${line.trim()}`);
    }
  }
}

const criticalCoverageReady = missingFiles.length === 0 && onlySites.length === 0 && skipSites.length === 0;
const summary = [
  '# Browser-test inventory',
  '',
  `- Spec files: ${specFiles.length}`,
  `- Source-level test declarations: ${testDeclarations}`,
  `- Describe blocks: ${describeBlocks}`,
  `- Missing required files: ${missingFiles.length}`,
  `- Exclusive test sites: ${onlySites.length}`,
  `- Skip/fixme sites: ${skipSites.length}`,
  `- Critical coverage ready: ${criticalCoverageReady ? 'yes' : 'no'}`,
];

if (missingFiles.length > 0) {
  summary.push('', '## Missing required files', '', ...missingFiles.map((item) => `- ${item}`));
}
if (onlySites.length > 0) {
  summary.push('', '## Exclusive tests', '', ...onlySites.map((item) => `- ${item}`));
}
if (skipSites.length > 0) {
  summary.push('', '## Skip and fixme sites', '', ...skipSites.map((item) => `- ${item}`));
}

const renderedSummary = `${summary.join('\n')}\n`;
process.stdout.write(renderedSummary);

if (
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.RUNNER_ENVIRONMENT === 'github-hosted' &&
  process.env.GITHUB_STEP_SUMMARY
) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderedSummary, 'utf8');
}

if (missingFiles.length > 0 || onlySites.length > 0 || (requireCritical && skipSites.length > 0)) {
  process.exitCode = 1;
}
