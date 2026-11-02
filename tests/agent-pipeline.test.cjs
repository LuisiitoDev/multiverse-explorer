// Execute the actual authored github-script steps with offline boundary doubles.
// No token, GitHub request, shell command, workflow dispatch or real file write.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const BASE = 'a'.repeat(40), HEAD = 'b'.repeat(40), CODE = 'c'.repeat(40);
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const clone = obj => structuredClone(obj);

function script(file, step) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const at = text.indexOf(`- name: ${step}\n`);
  assert.ok(at >= 0, `Missing step: ${step}`);
  const lines = text.slice(at).split('\n');
  const start = lines.findIndex(line => /^\s+script: \|$/.test(line)) + 1;
  assert.ok(start > 0, 'Missing inline script');
  const indent = lines[start].match(/^ */)[0].length;
  let end = start;
  while (end < lines.length && (!lines[end].trim() || lines[end].match(/^ */)[0].length >= indent)) end++;
  return lines.slice(start, end).map(line => line.slice(indent)).join('\n');
}

function fixture() {
  const state = {
    issue: {number: 50, title: 'Feature', body: 'Build the globe', state: 'open'},
    pr: {number: 74, state: 'open', title: '[Agent Lab] Issue #50', labels: [{name: 'agent-plan'}],
      head: {sha: HEAD, ref: 'agent-plan/issue-50', repo: {full_name: 'LuisiitoDev/multiverse-explorer'}}, base: {ref: 'main'}},
    reviews: [{state: 'approved', comment: '', user: {login: 'LuisiitoDev', type: 'User'},
      environments: [{name: 'implementation-approval', id: 25913204746}]}],
    permission: {role_name: 'admin', permission: 'admin'}, comments: [], main: BASE,
    branchExists: false, open: null, writes: [], files: {}, materialized: {}, calls: []
  };
  for (const ref of [HEAD, CODE]) {
    state.files[`${ref}:specs/issue-50/spec.md`] = 'spec';
    state.files[`${ref}:specs/issue-50/plan.md`] = 'plan';
    state.files[`${ref}:specs/issue-50/issue-snapshot.json`] = JSON.stringify({number: 50, title: 'Feature', body: 'Build the globe'});
  }
  const outputs = {}, failures = [];
  const env = {ISSUE_NUMBER: '50', PR_NUMBER: '74', HEAD_SHA: HEAD, EXPECTED_HEAD_SHA: HEAD,
    SPEC_SHA256: digest('spec'), PLAN_SHA256: digest('plan'), BASE_COMMIT: BASE,
    COMMENTS_SHA256: digest('[]'), GITHUB_RUN_ATTEMPT: '1', AGENT_WORKER: 'implementer',
    TRANSITION_ID: 'd'.repeat(32), ATTEMPT: '1', REMEDIATION_JSON: '[]'};
  const context = {repo: {owner: 'LuisiitoDev', repo: 'multiverse-explorer'}, runId: 41395908995,
    eventName: 'workflow_dispatch', payload: {inputs: {issue_number: '50'}, sender: {type: 'User', login: 'LuisiitoDev'}}};
  const data = value => Promise.resolve({data: clone(value)});
  const marker = name => () => { throw Error(`Use github.paginate for ${name}`); };
  const github = {rest: {
    repos: {
      getCollaboratorPermissionLevel: async () => data(state.permission),
      getContent: async ({path: p, ref}) => {
        const raw = state.files[`${ref}:${p}`]; assert.notEqual(raw, undefined, `Unexpected file ${ref}:${p}`);
        return data({type: 'file', encoding: 'base64', content: Buffer.from(raw).toString('base64')});
      },
      compareCommitsWithBasehead: async ({basehead}) => data({status: state.ancestry || (basehead.endsWith(CODE) ? 'ahead' : 'identical')}),
      createOrUpdateFileContents: async args => {state.writes.push(['seed', clone(args)]); return data({});}
    },
    git: {
      getRef: async ({ref}) => {
        if (ref === 'heads/main') return data({object: {sha: state.main}});
        if (state.branchExists) return data({object: {sha: HEAD}});
        throw Object.assign(Error('Not found'), {status: 404});
      },
      createRef: async args => {state.writes.push(['ref', clone(args)]); state.pr.head.ref = args.ref.slice('refs/heads/'.length); return data({});}
    },
    pulls: {
      get: async () => data(state.pr), list: marker('pulls'),
      create: async args => {state.writes.push(['pull', clone(args)]); return data(state.pr);},
      updateBranch: async () => {throw Error('Unexpected branch update');}
    },
    issues: {
      get: async () => data(state.issue), listComments: marker('comments'), listLabelsOnIssue: marker('labels'),
      addLabels: async args => {state.writes.push(['labels', clone(args)]); return data({});},
      removeLabel: async () => data({})
    }
  },
    request: async (route, args) => {
      assert.equal(route, 'GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals');
      assert.equal(args.run_id, context.runId);
      state.calls.push(['approvals', clone(args)]);
      if (state.apiFailure) throw Error('HTTP 403: Actions read denied');
      return data(state.reviews);
    },
    paginate: async method => {
      if (method === github.rest.issues.listComments) return clone(state.comments);
      if (method === github.rest.pulls.list) return clone(state.open === null ? [state.pr] : state.open);
      if (method === github.rest.issues.listLabelsOnIssue) return [];
      throw Error('Unexpected pagination target');
    }
  };
  const core = {setOutput: (key, value) => {outputs[key] = value;}, setFailed: message => failures.push(message), notice: () => {}};
  const fakeFs = {mkdirSync: () => {}, writeFileSync: (p, bytes) => {state.materialized[p] = JSON.parse(bytes);}};
  const requireDouble = name => name === 'fs' ? fakeFs : name === 'crypto' ? crypto : assert.fail(`Unexpected module ${name}`);
  async function run(file, step) {
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    await new AsyncFunction('require', 'github', 'context', 'core', 'process', 'Buffer', script(file, step))(
      requireDouble, github, context, core, {env}, Buffer);
  }
  return {state, outputs, failures, env, context, github, run};
}
const pipeline = '.github/workflows/agent-pipeline.yml';
const prepare = '.github/workflows/shared/agent-prepare.md';
const approve = f => f.run(pipeline, 'Verify native environment approval');
const worker = f => f.run(prepare, 'Validate pipeline inputs and canonical PR');
async function approved() {
  const f = fixture(); await approve(f);
  assert.deepEqual(f.failures, []);
  f.env.APPROVAL_JSON = f.outputs.approval_json;
  return f;
}

test('native environment review authorizes the exact plan without an issue command', async () => {
  const f = await approved(), record = JSON.parse(f.outputs.approval_json);
  assert.equal(record.actor, 'LuisiitoDev'); assert.equal(record.workflow_run_id, f.context.runId);
  assert.equal(record.environment_name, 'implementation-approval'); assert.equal(record.approved_head_sha, HEAD);
  assert.equal(record.plan_sha256, digest('plan')); assert.equal(record.comment_id, undefined);
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'docs/agent-handoffs/approval.schema.json')));
  for (const key of schema.required) assert.ok(Object.hasOwn(record, key), `Missing ${key}`);
  for (const key of Object.keys(record)) assert.ok(Object.hasOwn(schema.properties, key), `Unexpected ${key}`);
});
for (const [name, change, error] of [
  ['unprotected environment with no native review', f => {f.state.reviews = [];}, /No human/],
  ['review for a different environment', f => {f.state.reviews[0].environments[0].name = 'production';}, /No human/],
  ['rejected review', f => {f.state.reviews[0].state = 'rejected';}, /rejected/],
  ['bot approval', f => {f.state.reviews[0].user.type = 'Bot';}, /No human/],
  ['non-writer approval', f => {f.state.permission = {permission: 'read', role_name: 'read'};}, /No human/],
  ['Actions evidence denied', f => {f.state.apiFailure = true;}, /403/],
  ['changed PR head', f => {f.state.pr.head.sha = CODE;}, /PR changed/],
  ['changed main', f => {f.state.main = CODE;}, /main advanced/],
  ['tampered approved plan', f => {f.state.files[`${HEAD}:specs/issue-50/plan.md`] = 'other';}, /documents changed/],
  ['new human decisions', f => {f.state.comments.push({id: 1, updated_at: 'now', body: 'new scope', user: {type: 'User'}});}, /decisions changed/]
]) test(`approval gate rejects ${name}`, async () => {
  const f = fixture(); change(f); await approve(f);
  assert.match(f.failures.join('\n'), error); assert.equal(f.outputs.approval_json, undefined);
});
test('an old slash approval cannot substitute for a native review', async () => {
  const f = fixture(); f.state.reviews = [];
  f.state.comments.push({id: 1, body: `/agent approve ${HEAD} ${digest('plan')}`, user: {type: 'User'}});
  await approve(f); assert.match(f.failures.join(), /No human/);
});
test('post-planning worker independently verifies native evidence before writing context', async () => {
  const f = await approved(); await worker(f);
  assert.equal(f.state.calls.length, 2);
  assert.equal(f.state.materialized['/tmp/gh-aw/approval.json'].workflow_run_id, f.context.runId);
  assert.equal(f.state.materialized['/tmp/gh-aw/agent-context.json'].worker, 'implementer');
});
test('reviewer independently verifies the same approval on a descendant head', async () => {
  const f = await approved(); f.env.AGENT_WORKER = 'reviewer'; f.env.EXPECTED_HEAD_SHA = CODE; f.state.pr.head.sha = CODE;
  await worker(f); assert.equal(f.state.materialized['/tmp/gh-aw/agent-context.json'].expected_head_sha, CODE);
});
for (const [name, change, error] of [
  ['another run record', f => {const a = JSON.parse(f.env.APPROVAL_JSON); a.workflow_run_id++; f.env.APPROVAL_JSON = JSON.stringify(a);}, /another run/],
  ['future attempt record', f => {const a = JSON.parse(f.env.APPROVAL_JSON); a.run_attempt = 2; f.env.APPROVAL_JSON = JSON.stringify(a);}, /another run/],
  ['removed native evidence', f => {f.state.reviews = [];}, /Native approval/],
  ['wrong environment identity', f => {f.state.reviews[0].environments[0].id++;}, /Native approval/],
  ['changed approval actor', f => {f.state.reviews[0].user.login = 'other';}, /Native approval/],
  ['bot native actor', f => {f.state.reviews[0].user.type = 'Bot';}, /write permission/],
  ['revoked writer permission', f => {f.state.permission = {role_name: 'read', permission: 'read'};}, /write permission/],
  ['rejected native review', f => {f.state.reviews[0].state = 'rejected';}, /rejected/],
  ['changed issue requirements', f => {f.state.issue.body = 'New requirements';}, /Issue changed/],
  ['closed issue', f => {f.state.issue.state = 'closed';}, /Issue changed/],
  ['new human answer', f => {f.state.comments.push({id: 2, updated_at: 'later', body: 'new decision', user: {type: 'User'}});}, /decisions changed/],
  ['changed approved bytes', f => {f.state.files[`${HEAD}:specs/issue-50/plan.md`] = 'tampered';}, /changed after approval/],
  ['rewritten ancestry', f => {f.state.ancestry = 'diverged';}, /include current main/],
  ['moved head before startup', f => {f.state.pr.head.sha = CODE;}, /head moved/]
]) test(`worker refuses ${name}`, async () => {
  const f = await approved(); change(f);
  await assert.rejects(() => worker(f), error);
  assert.deepEqual(f.state.materialized, {});
});
test('rerunning failed jobs may reuse this run approval for the unchanged plan', async () => {
  const f = await approved(); f.env.GITHUB_RUN_ATTEMPT = '2'; await worker(f);
  assert.equal(f.state.materialized['/tmp/gh-aw/approval.json'].run_attempt, 1);
});
test('planner never requires an implementation approval record', async () => {
  const f = fixture(); f.env.AGENT_WORKER = 'planner'; f.state.reviews = []; await worker(f);
  assert.equal(f.state.materialized['/tmp/gh-aw/agent-context.json'].approval, null);
  assert.equal(f.state.calls.length, 0);
});
test('a single open canonical PR is reused', async () => {
  const f = fixture(); await f.run(pipeline, 'Route event to the canonical PR');
  assert.deepEqual(f.failures, []); assert.equal(f.outputs.pr_number, '74');
  assert.equal(f.state.writes.filter(w => ['ref', 'pull'].includes(w[0])).length, 0);
});
test('initial planning creates the first canonical PR', async () => {
  const f = fixture(); f.state.open = []; await f.run(pipeline, 'Route event to the canonical PR');
  assert.deepEqual(f.failures, []); assert.equal(f.state.writes.find(w => w[0] === 'ref')[1].ref, 'refs/heads/agent-plan/issue-50');
  assert.equal(f.state.writes.filter(w => w[0] === 'pull').length, 1);
});
test('a closed old PR with a surviving branch permits a fresh branch/PR', async () => {
  const f = fixture(); f.state.open = []; f.state.branchExists = true;
  await f.run(pipeline, 'Route event to the canonical PR');
  assert.deepEqual(f.failures, []);
  const branch = `agent-plan/issue-50-run-${f.context.runId}-1`;
  assert.equal(f.state.writes.find(w => w[0] === 'ref')[1].ref, `refs/heads/${branch}`);
  assert.equal(f.state.writes.find(w => w[0] === 'ref')[1].sha, BASE);
  assert.equal(f.state.writes.find(w => w[0] === 'pull')[1].head, branch);
});
test('repeated failed bootstrap uses a different attempt branch without overwriting', async () => {
  const f = fixture(); f.state.open = []; f.state.branchExists = true; f.env.GITHUB_RUN_ATTEMPT = '2';
  await f.run(pipeline, 'Route event to the canonical PR');
  assert.deepEqual(f.failures, []);
  assert.ok(f.state.writes.find(w => w[0] === 'ref')[1].ref.endsWith('-2'));
});
test('multiple open canonical PRs still fail closed', async () => {
  const f = fixture(); f.state.open = [f.state.pr, {...clone(f.state.pr), number: 75}];
  await f.run(pipeline, 'Route event to the canonical PR');
  assert.match(f.failures.join(), /Multiple canonical PRs/); assert.deepEqual(f.state.writes, []);
});
test('non-writer cannot start a planning pipeline', async () => {
  const f = fixture(); f.state.permission = {permission: 'read', role_name: 'read'};
  await f.run(pipeline, 'Route event to the canonical PR');
  assert.equal(f.outputs.run, 'false'); assert.deepEqual(f.state.writes, []);
});
