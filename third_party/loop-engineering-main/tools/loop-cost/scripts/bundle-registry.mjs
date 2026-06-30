#!/usr/bin/env node
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_REGISTRY = path.resolve(PACKAGE_ROOT, '../../patterns/registry.yaml');
const DEST = path.join(PACKAGE_ROOT, 'registry.json');

try {
  await access(REPO_REGISTRY);
} catch {
  console.log('bundle-registry: no monorepo registry — keeping existing registry.json');
  process.exit(0);
}

const doc = yaml.parse(await readFile(REPO_REGISTRY, 'utf8'));
await writeFile(DEST, JSON.stringify(doc, null, 2));
console.log('bundled patterns/registry.yaml → tools/loop-cost/registry.json');