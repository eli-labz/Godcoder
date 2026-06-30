import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditProject } from '../dist/auditor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, 'fixtures');

test('good-goal-project fixture scores G2+', async () => {
  const target = path.join(fixturesRoot, 'good-goal-project');
  const result = await auditProject(target);
  assert.ok(result.score >= 60, `expected G2+, got ${result.score} (${result.level})`);
  assert.equal(result.signals.verifier.present, true);
  assert.equal(result.signals.goalFile.present, true);
});

test('empty temp dir scores low', async () => {
  const tmp = path.join(fixturesRoot, 'fixtures-empty');
  const result = await auditProject(tmp);
  assert.ok(result.score < 40);
  assert.equal(result.level, 'G0');
});