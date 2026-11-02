// Configuration checks only: no App credential, token mint, API call or workflow.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, '.github/workflows/agent-implement.md'), 'utf8');
const pipeline = fs.readFileSync(path.join(root, '.github/workflows/agent-pipeline.yml'), 'utf8');
const envelope = JSON.parse(fs.readFileSync(path.join(root, 'docs/agent-handoffs/publication-scope.json')));
const workflows = ['cd.yml', 'infra.yml', 'bluegreen-swap.yml', 'set-feature-flag.yml'].map(p => `.github/workflows/${p}`);
function job(text, name) {
  const start = text.indexOf(`\n  ${name}:\n`);
  assert.ok(start >= 0, `Missing job ${name}`);
  const rest = text.slice(start + 1);
  const next = rest.slice(rest.indexOf('\n') + 1).search(/^  [A-Za-z0-9_-]+:\s*$/m);
  return next < 0 ? rest : rest.slice(0, rest.indexOf('\n') + 1 + next);
}
test('App is configured for publisher outputs with explicit repository scope', () => {
  const safe = worker.split('\nsafe-outputs:\n')[1];
  assert.match(safe, /github-app:\n\s+client-id: \$\{\{ vars.GH_AW_APP_CLIENT_ID \}\}/);
  assert.match(safe, /private-key: \$\{\{ secrets.GH_AW_APP_PRIVATE_KEY \}\}/);
  assert.match(safe, /owner: LuisiitoDev\n\s+repositories:\n\s+- multiverse-explorer/);
  assert.match(safe, /push-to-pull-request-branch:\n\s+allow-workflows: true/);
  assert.ok(!safe.includes('ignore-if-missing: true'));
});
test('workflow publication is limited to the four approved deployment files', () => {
  assert.deepEqual(envelope.allowed_files.filter(p => p.startsWith('.github/workflows/')), workflows);
  assert.ok(!envelope.allowed_files.includes('.github/workflows/**'));
  for (const p of workflows) assert.ok(worker.includes(`    - ${p}\n`));
  for (const p of ['agent-pipeline.yml', 'agent-implement.lock.yml', 'ci.yml', 'copilot-setup-steps.yml'])
    assert.ok(!envelope.allowed_files.includes(`.github/workflows/${p}`));
});
test('App permission preflight runs before the model and exports no token across jobs', () => {
  const auth = job(pipeline, 'publisher-auth');
  assert.match(auth, /needs: route/); assert.match(auth, /permissions: \{\}/);
  assert.match(auth, /actions\/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510/);
  assert.match(auth, /owner: LuisiitoDev/); assert.match(auth, /repositories: multiverse-explorer/);
  assert.match(auth, /permission-workflows: write/);
  assert.match(auth, /permission-administration: read/);
  assert.ok(!auth.includes('permission-administration: write'));
  assert.ok(!auth.includes('skip-token-revoke: true')); assert.ok(!auth.includes('\n    outputs:'));
  assert.match(job(pipeline, 'plan'), /needs: \[route, publisher-auth\]/);
  assert.ok(!pipeline.includes('outputs.token'));
});
test('presence check receives only a boolean for the key', () => {
  assert.match(pipeline, /PUBLISHER_APP_KEY_CONFIGURED: \$\{\{ secrets.GH_AW_APP_PRIVATE_KEY != '' \}\}/);
  const route = job(pipeline, 'route');
  assert.ok(!route.includes('PUBLISHER_APP_PRIVATE_KEY:'));
  assert.ok(route.indexOf('Publisher GitHub App is not configured') < route.indexOf('github.rest.git.createRef'));
});
test('normal compiled lock grants Workflows only to the repository-scoped publisher', {skip: !process.env.CHECK_COMPILED_LOCK}, () => {
  const lock = fs.readFileSync(path.join(root, '.github/workflows/agent-implement.lock.yml'), 'utf8');
  const safe = job(lock, 'safe_outputs');
  assert.match(safe, /permission-workflows:\s*['"]?write/);
  assert.ok(safe.includes('secrets.GH_AW_APP_PRIVATE_KEY'));
  assert.ok(safe.includes('LuisiitoDev') && safe.includes('multiverse-explorer'));
  assert.ok(!job(lock, 'agent').includes('secrets.GH_AW_APP_PRIVATE_KEY'));
  assert.ok(!job(lock, 'detection').includes('secrets.GH_AW_APP_PRIVATE_KEY'));
  assert.ok(!safe.includes('skip-token-revoke: true'));
  const scopes = text => [...text.matchAll(/permission-([a-z-]+):\s*[\"']?(read|write)/g)].map(m => `${m[1]}:${m[2]}`).sort();
  assert.deepEqual(scopes(safe), scopes(job(pipeline, 'publisher-auth')), 'preflight must request exactly the publisher token scopes');
  assert.ok(lock.includes('protected_files_policy'));
});
