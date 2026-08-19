#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_REPOSITORY = 'travisjneuman/neumanos';
const ALLOWED_PROJECT_SETS = new Set([
  '--project=chromium --project=mobile-chrome',
  '--project=firefox',
  '--project=webkit --project=mobile-safari',
]);
const ALLOWED_SHARDS = new Set(['--shard=1/4', '--shard=2/4', '--shard=3/4', '--shard=4/4']);

export function getHostedRunnerViolations({ env, platform, cwd }) {
  const violations = [];
  const workspace = env.GITHUB_WORKSPACE ? path.resolve(env.GITHUB_WORKSPACE) : '';

  if (platform !== 'linux') violations.push('platform must be Linux');
  if (env.CI !== 'true') violations.push('CI must be true');
  if (env.GITHUB_ACTIONS !== 'true') violations.push('GITHUB_ACTIONS must be true');
  if (env.RUNNER_ENVIRONMENT !== 'github-hosted') {
    violations.push('RUNNER_ENVIRONMENT must be github-hosted');
  }
  if (env.RUNNER_OS !== 'Linux') violations.push('RUNNER_OS must be Linux');
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
    violations.push('GITHUB_EVENT_NAME must be workflow_dispatch');
  }
  if (env.GITHUB_REPOSITORY !== EXPECTED_REPOSITORY) {
    violations.push(`GITHUB_REPOSITORY must be ${EXPECTED_REPOSITORY}`);
  }
  if (!workspace.startsWith('/home/runner/work/')) {
    violations.push('GITHUB_WORKSPACE must be under the GitHub-hosted runner root');
  }
  if (workspace && path.resolve(cwd) !== workspace) {
    violations.push('current directory must equal GITHUB_WORKSPACE');
  }
  if (env.TEST_BASE_URL) {
    violations.push('TEST_BASE_URL is forbidden; tests use the task-owned local preview');
  }

  return violations;
}

export function getBrowserInvocationViolations(projectArguments) {
  const violations = [];
  const shardArgument = projectArguments.at(-1);
  const projectSet = projectArguments.slice(0, -1).join(' ');

  if (!ALLOWED_PROJECT_SETS.has(projectSet)) {
    violations.push(`unsupported browser-test project set: ${projectSet || '(none)'}`);
  }
  if (!ALLOWED_SHARDS.has(shardArgument)) {
    violations.push(`unsupported browser-test shard: ${shardArgument || '(none)'}`);
  }

  return violations;
}

function main() {
  const violations = getHostedRunnerViolations({
    env: process.env,
    platform: process.platform,
    cwd: process.cwd(),
  });
  const projectArguments = process.argv.slice(2);
  violations.push(...getBrowserInvocationViolations(projectArguments));

  if (violations.length > 0) {
    console.error('Hosted browser-test guard denied execution:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 2;
    return;
  }

  const require = createRequire(import.meta.url);
  const cliPath = require.resolve('@playwright/test/cli');
  const result = spawnSync(process.execPath, [cliPath, 'test', ...projectArguments], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
