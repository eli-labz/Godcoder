#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

const registry = yaml.parse(await readFile(path.join(ROOT, 'patterns/registry.yaml'), 'utf8'));
const cli = await readFile(path.join(ROOT, 'tools/loop-init/src/cli.ts'), 'utf8');

for (const p of registry.patterns) {
  if (!cli.includes(`'${p.id}'`)) {
    fail(`loop-init cli.ts missing pattern id: ${p.id}`);
  }
}

console.log(`loop-init pattern sync OK (${registry.patterns.length} patterns) ✓`);