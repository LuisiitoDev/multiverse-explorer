// Actual workflow scripts + real pinned JSON Schema validation, offline API doubles.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const modules = process.env.AGENT_TEST_NODE_MODULES || path.join(root, 'node_modules');
const Ajv = require(path.join(modules, 'ajv/dist/2020'));
const formats = require(path.join(modules, 'ajv-formats'));
const BASE = 'a'.repeat(40), PLAN = 'b'.repeat(40), CODE = 'c'.repeat(40), EMPTY = 'd'.repeat(40);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/approved-publication-handoff.json')));
function script(file, step) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(`- name: ${step}\n`)[1].split('\n');
  const start = lines.findIndex(l => /^\s+script: \|$/.test(l)) + 1;
  assert.ok(start > 0);
  const width = lines[start].match(/^ */)[0].length;
  let end = start;
  while (end < lines.length && (!lines[end].trim() || lines[end].match(/^ */)[0].length >= width)) end++;
  return lines.slice(start, end).map(l => l.slice(width)).join('\n');
}
function setup(planning = false) {
  const issue = {number: 50, title: 'Globe', body: 'Approved task', state: 'open'};
  const snapshot = JSON.stringify({number: issue.number, title: issue.title, body: issue.body});
  const handoff = copy(fixture);
  handoff.execution_scope.allowed_paths = handoff.execution_scope.allowed_paths.filter(p => !p.startsWith('.github/workflows/'));
  handoff.base_commit = BASE; handoff.spec.spec_sha256 = sha('spec'); handoff.plan.plan_sha256 = sha('plan');
  handoff.issue.snapshot_sha256 = sha(snapshot);
  const approval = {issue_number: 50, pr_number: 74, approved_head_sha: PLAN,
    spec_sha256: sha('spec'), plan_sha256: sha('plan'), base_commit: BASE};
  const report = {schema_version: '1.0.0', status: 'IMPLEMENTED', transition_id: 'e'.repeat(32), issue_number: 50,
    pr_number: 74, plan_sha256: sha('plan'), base_commit: BASE,
    files_changed: ['frontend/src/globe.ts', 'THIRD_PARTY_NOTICES.md', 'docs/blue-green-deployment.md',
      'docs/canary-deployment.md', 'specs/issue-50/implementation-handoff.json'],
    requirements_addressed: ['SC-001'], local_validation: [{command: 'npm test', result: 'passed', evidence: 'offline fixture'}], deviations: []};
  const state = {handoff, report, issue, diff: report.files_changed.map(filename => ({filename})),
    ancestry: 'ahead', extra: {status: 'ahead', files: []}, material: {}, writes: [], comments: [],
    pr: {number: 74, state: 'open', title: '[Agent Lab] Issue #50', labels: [{name: 'agent-plan'}],
      head: {sha: planning ? PLAN : CODE, ref: 'agent-plan/issue-50', repo: {full_name: 'LuisiitoDev/multiverse-explorer'}}, base: {ref: 'main'}}};
  for (const ref of [PLAN, CODE, EMPTY]) {
    for (const [name, value] of [['spec.md', 'spec'], ['plan.md', 'plan'], ['issue-snapshot.json', snapshot]])
      state.material[`${ref}:specs/issue-50/${name}`] = value;
  }
  const env = {ISSUE_NUMBER: '50', PR_NUMBER: '74', START_HEAD_SHA: PLAN, PUBLISHED_HEAD_SHA: CODE,
    TRANSITION_ID: report.transition_id, APPROVAL_JSON: JSON.stringify(approval), COMMENTS_SHA256: sha('[]'), RUNNER_TEMP: '/fixture'};
  const outputs = {}, failures = [];
  const response = value => Promise.resolve({data: copy(value)});
  const marker = () => {};
  const github = {rest: {
    pulls: {get: async () => response(state.pr)},
    git: {getRef: async () => response({object: {sha: BASE}})},
    repos: {
      compareCommitsWithBasehead: async ({basehead}) => {
        if (basehead.startsWith(`${CODE}...`) && state.pr.head.sha !== CODE) return response(state.extra);
        return response({status: state.ancestry, files: state.diff});
      },
      getContent: async ({path: p, ref}) => {
        let bytes;
        if (p.endsWith('/planner-handoff.json')) {
          bytes = JSON.stringify(state.handoff);
          if (state.changedHandoff && ref !== PLAN) bytes += ' ';
        } else if (p.endsWith('/implementation-handoff.json')) bytes = JSON.stringify(state.report);
        else bytes = state.material[`${ref}:${p}`];
        assert.notEqual(bytes, undefined, `Unexpected data read: ${p}@${ref}`);
        return response({type: 'file', size: Buffer.byteLength(bytes), encoding: 'base64', content: Buffer.from(bytes).toString('base64')});
      }
    },
    issues: {get: async () => response(state.issue), listComments: marker, listLabelsOnIssue: marker,
      removeLabel: async () => response({}),
      addLabels: async args => {state.writes.push(['labels', copy(args)]); return response({});},
      createComment: async args => {state.writes.push(['comment', copy(args)]); return response({});}}
  }, paginate: async method => method === github.rest.issues.listComments ? copy(state.comments) : []};
  const sourceFs = {readFileSync: (p, encoding) => {
    assert.ok(p.startsWith('docs/agent-handoffs/') && p.endsWith('.json'));
    return fs.readFileSync(path.join(root, p), encoding);
  }};
  const boundaryRequire = name => name === 'fs' ? sourceFs : name === 'crypto' ? crypto :
    name.endsWith('/ajv/dist/2020') ? Ajv : name.endsWith('/ajv-formats') ? formats : assert.fail(`Unexpected require ${name}`);
  const core = {setOutput: (k, v) => {outputs[k] = v;}, setFailed: m => failures.push(m)};
  const context = {repo: {owner: 'LuisiitoDev', repo: 'multiverse-explorer'}, runId: 41481004308, serverUrl: 'https://github.com'};
  async function run() {
    const source = planning ? script('.github/workflows/agent-pipeline.yml', 'Validate planner handoff') :
      script('.github/workflows/agent-iteration.yml', 'Validate implementation handoff');
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction('require', 'github', 'context', 'core', 'process', 'Buffer', source)(
      boundaryRequire, github, context, core, {env}, Buffer);
  }
  return {state, env, outputs, failures, run};
}
test('publisher envelope matches the authored safe output, including the three approved documents', () => {
  const source = fs.readFileSync(path.join(root, '.github/workflows/agent-implement.md'), 'utf8');
  const paths = source.split('    allowed-files:\n')[1].split('\n    fallback-as-pull-request:')[0]
    .split('\n').filter(l => l.startsWith('    - ')).map(l => l.slice(6));
  const envelope = JSON.parse(fs.readFileSync(path.join(root, 'docs/agent-handoffs/publication-scope.json'))).allowed_files;
  assert.deepEqual(paths, envelope);
  for (const p of ['THIRD_PARTY_NOTICES.md', 'docs/blue-green-deployment.md', 'docs/canary-deployment.md']) {
    assert.ok(envelope.includes(p)); assert.ok(fixture.execution_scope.allowed_paths.includes(p));
  }
  assert.ok(!envelope.includes('**')); assert.ok(!envelope.includes('docs/**'));
  assert.ok(!envelope.some(p => p === '.github/workflows' || p.startsWith('.github/workflows/')));
  assert.ok(!source.includes('protected-files: allowed'));
});
test('approved published implementation advances with the actual remote head', async () => {
  const f = setup(); await f.run(); assert.deepEqual(f.failures, []); assert.equal(f.outputs.head_sha, CODE);
});
test('missing publisher SHA reproduces skipped publication and blocks before CI', async () => {
  const f = setup(); f.env.PUBLISHED_HEAD_SHA = ''; f.state.pr.head.sha = PLAN; await f.run();
  assert.match(f.failures.join(), /publication was skipped or failed/); assert.equal(f.outputs.head_sha, undefined);
});
test('empty CI-trigger commit after publisher SHA is accepted', async () => {
  const f = setup(); f.state.pr.head.sha = EMPTY; await f.run(); assert.deepEqual(f.failures, []); assert.equal(f.outputs.head_sha, EMPTY);
});
for (const [name, change, message] of [
  ['publication with unchanged remote head', f => {f.state.ancestry = 'identical';}, /did not publish new commits/],
  ['closed PR', f => {f.state.pr.state = 'closed';}, /identity changed/],
  ['foreign PR repository', f => {f.state.pr.head.repo.full_name = 'other/repo';}, /identity changed/],
  ['another issue branch', f => {f.state.pr.head.ref = 'agent-plan/issue-500';}, /identity changed/],
  ['content changed after publisher', f => {f.state.pr.head.sha = EMPTY; f.state.extra.files = [{filename: 'frontend/src/unexpected.ts'}];}, /after safe-output/],
  ['changed approved handoff', f => {f.state.changedHandoff = true;}, /handoff changed/],
  ['changed approved plan', f => {f.state.material[`${CODE}:specs/issue-50/plan.md`] = 'new plan';}, /plan changed/],
  ['path outside approved scope', f => {f.state.diff.push({filename: 'backend/unapproved.cs'});}, /outside approved scope/],
  ['denied path overrides allow', f => {f.state.handoff.execution_scope.allowed_paths.push('backend/**'); f.state.diff.push({filename: 'backend/unapproved.cs'});}, /outside approved scope/],
  ['agent control workflow modification', f => {f.state.diff.push({filename: '.github/workflows/agent-pipeline.yml'});}, /Workflow changes require a human/],
  ['workflow modification in an old approved scope', f => {f.state.handoff.execution_scope.allowed_paths.push('.github/workflows/cd.yml'); f.state.diff.push({filename: '.github/workflows/cd.yml'});}, /Workflow changes require a human/],
  ['rename from a workflow', f => {f.state.diff.push({filename: 'frontend/src/old.yml', previous_filename: '.github/workflows/cd.yml'});}, /Workflow changes require a human/],
  ['rename from denied location', f => {f.state.diff.push({filename: 'frontend/src/ok.ts', previous_filename: 'backend/private.cs'});}, /outside approved scope/],
  ['path traversal', f => {f.state.diff.push({filename: 'frontend/src/../../secret.txt'});}, /Invalid scope path/],
  ['truncated GitHub compare', f => {f.state.diff = Array.from({length: 300}, () => ({filename: 'frontend/src/a.ts'}));}, /Incomplete implementation diff/],
  ['handoff schema failure', f => {delete f.state.report.transition_id;}, /Invalid implementation.schema/],
  ['another transition', f => {f.state.report.transition_id = 'f'.repeat(32);}, /identity does not match/],
  ['PARTIAL report with missing validation', f => {f.state.report.status = 'PARTIAL'; f.state.report.local_validation[0].result = 'not_run';}, /PARTIAL; pending checks: npm test/],
  ['failed local validation', f => {f.state.report.local_validation[0].result = 'failed';}, /lacks passing/]
]) test(`implementation gate rejects ${name}`, async () => {
  const f = setup(); change(f); await f.run(); assert.match(f.failures.join('\n'), message);
  assert.equal(f.outputs.head_sha, undefined); assert.deepEqual(f.state.writes, []);
});
test('planner preflight accepts the scope after workflow files are removed', async () => {
  const f = setup(true); await f.run(); assert.deepEqual(f.failures, []); assert.equal(f.outputs.status, 'PLANNED');
});
test('planner preflight rejects the original scope with workflow files', async () => {
  const f = setup(true); f.state.handoff.execution_scope.allowed_paths = copy(fixture.execution_scope.allowed_paths); await f.run();
  assert.match(f.failures.join(), /outside publication capability: .*\.github\/workflows\/cd\.yml/);
  assert.equal(f.outputs.status, undefined); assert.deepEqual(f.state.writes, []);
});
test('planner BLOCKED stops before approval when manual work is incomplete', async () => {
  const f = setup(true); f.state.handoff.status = 'BLOCKED'; f.state.handoff.requires_human_decision = ['Apply and validate the workflow change manually']; await f.run();
  assert.deepEqual(f.failures, []); assert.equal(f.outputs.status, 'BLOCKED'); assert.deepEqual(f.state.writes, []);
});
test('planner preflight blocks an unsupported publication path before human approval', async () => {
  const f = setup(true); f.state.handoff.execution_scope.allowed_paths.push('docs/unsupported.md'); await f.run();
  assert.match(f.failures.join(), /outside publication capability: docs\/unsupported.md/);
  assert.equal(f.outputs.status, undefined); assert.deepEqual(f.state.writes, []);
});
test('planner preflight rejects unsupported execution globs', async () => {
  const f = setup(true); f.state.handoff.execution_scope.allowed_paths.push('frontend/*.ts'); await f.run();
  assert.match(f.failures.join(), /Invalid execution scope/); assert.deepEqual(f.state.writes, []);
});
