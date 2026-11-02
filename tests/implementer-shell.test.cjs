// Policy regression for documented Copilot exact/:* command-stem semantics.
// This does not run Copilot, package managers, scripts, network calls or an agent.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, '.github/workflows/agent-implement.md'), 'utf8');
const block = source.split('  bash:\n')[1].split('\nnetwork:')[0];
const rules = block.split('\n').filter(l => l.startsWith('  - ')).map(l => l.slice(4).replace(/^['"]|['"]$/g, ''));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/implementer-shell-incident.json')));
// Single commands only. Compound shell parsing is the engine's responsibility;
// these tests intentionally make no claim to reproduce its parser/sandbox.
const permits = (command, allow = rules) => allow.some(rule => rule.endsWith(':*') ?
  command.startsWith(rule.slice(0, -2) + ' ') : command === rule);
for (const command of [...fixture.observed_denied_diagnostics, ...fixture.task_commands_not_attempted,
  'node --version', 'npm -v', 'dotnet restore backend/src/Favorites.Api/Favorites.Api.csproj',
  'dotnet build backend/src/Favorites.Api/Favorites.Api.csproj --no-restore --configuration Release',
  'dotnet test backend/test/Favorites.UnitTests/Favorites.UnitTests.csproj --configuration Release']) {
  test(`configured rules permit ${command}`, () => assert.ok(permits(command)));
}
for (const command of ['npm publish', 'npm exec arbitrary', 'npm uninstall package', 'npm config set registry https://example.com',
  'npx arbitrary', 'node -e arbitrary', 'node script.js', 'npm-install bad', 'dotnet test-evil project',
  'git push', 'az deployment group create', '/usr/bin/env node --version', 'bash -c arbitrary']) {
  test(`configured rules do not grant ${command}`, () => assert.equal(permits(command), false));
}
test('exact-only rules reproduce the argument mismatch', () => {
  const legacy = ['npm ci', 'npm install', 'npm run', 'npm test', 'dotnet restore', 'dotnet build', 'dotnet test'];
  for (const command of fixture.task_commands_not_attempted) assert.equal(permits(command, legacy), false);
});
test('permission prefixes do not enable a whole executable family', () => {
  for (const broad of ['*', 'npm:*', 'node:*', 'dotnet:*', 'npx', 'bash', 'env']) assert.ok(!rules.includes(broad));
});
test('the agent has a truthful, non-bypass execution contract', () => {
  assert.match(source, /never claim an install or test failed if it was not attempted/);
  assert.match(source, /Stop if\na required operation is actually denied/);
});
test('compiled production lock carries argument rules when compilation is requested', {skip: !process.env.CHECK_COMPILED_LOCK}, () => {
  const lock = fs.readFileSync(path.join(root, '.github/workflows/agent-implement.lock.yml'), 'utf8');
  for (const rule of rules.filter(r => /^(npm|node|dotnet)\b/.test(r))) assert.ok(lock.includes(`shell(${rule})`), `Missing compiled rule ${rule}`);
  for (const broad of ['shell(npm:*)', 'shell(node:*)', 'shell(dotnet:*)']) assert.ok(!lock.includes(broad));
});
