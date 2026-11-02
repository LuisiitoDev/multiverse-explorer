---
# Shared trusted pre-agent steps for the Planner, Implementer and Reviewer.
# Replaces scripts/prepare_agent_run.py. Imported by agent-plan.md,
# agent-implement.md and agent-review.md; each importer sets env.AGENT_WORKER.
#
# Runs from the trusted default-branch checkout BEFORE the PR head is checked
# out. Inputs are metadata from agent-pipeline.yml; issue content is never read
# here (the agents read it through GitHub MCP).
#
# Distinct per worker invocation so parallel pipelines for different issues
# never compete for the compiler-generated agent/conclusion job slots.
concurrency:
  job-discriminator: ${{ inputs.transition_id }}
steps:
- name: Validate pipeline inputs and canonical PR
  id: agent-prepare
  uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
  env:
    ISSUE_NUMBER: ${{ inputs.issue_number }}
    PR_NUMBER: ${{ inputs.pr_number }}
    EXPECTED_HEAD_SHA: ${{ inputs.expected_head_sha }}
    TRANSITION_ID: ${{ inputs.transition_id }}
    ATTEMPT: ${{ inputs.attempt }}
    APPROVAL_JSON: ${{ inputs.approval_json }}
    REMEDIATION_JSON: ${{ inputs.remediation_json }}
  with:
    script: |
      const fs = require('fs');
      const crypto = require('crypto');
      const { owner, repo } = context.repo;
      const env = process.env;
      const worker = env.AGENT_WORKER;
      const fail = (message) => { throw new Error(message); };
      const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
      const file = async (path, ref) => {
        const { data } = await github.rest.repos.getContent({ owner, repo, path, ref });
        if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64') fail(`${path} is not a regular file`);
        return Buffer.from(data.content, 'base64');
      };
      const descends = async (base, head) => {
        const { data } = await github.rest.repos.compareCommitsWithBasehead({ owner, repo, basehead: `${base}...${head}` });
        return ['ahead', 'identical'].includes(data.status);
      };
      const isWriter = async (user) => {
        if (user.type !== 'User') return false;
        const { data } = await github.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: user.login });
        return ['admin', 'maintain', 'write'].includes(data.role_name) || ['admin', 'write'].includes(data.permission);
      };

      if (!['planner', 'implementer', 'reviewer'].includes(worker)) fail('Unknown worker');
      if (!/^[1-9][0-9]*$/.test(env.ISSUE_NUMBER) || !/^[1-9][0-9]*$/.test(env.PR_NUMBER) ||
          !/^[0-9a-f]{40}$/.test(env.EXPECTED_HEAD_SHA) || !/^[0-9a-f]{32}$/.test(env.TRANSITION_ID) ||
          !/^[12]$/.test(env.ATTEMPT)) fail('Malformed pipeline inputs');
      const issue = Number(env.ISSUE_NUMBER);
      const prNumber = Number(env.PR_NUMBER);

      // Canonical PR identity: same repo, agent branch for THIS issue, markers, pinned head.
      const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
      const branch = new RegExp(`^agent-plan/issue-${issue}(?:-[A-Za-z0-9_-]+)?$`);
      if (pr.state !== 'open' || pr.base.ref !== 'main' ||
          pr.head.repo.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase() ||
          !branch.test(pr.head.ref) || !pr.title.startsWith('[Agent Lab] ') ||
          !pr.labels.some((label) => label.name === 'agent-plan')) fail('PR is not the canonical agent PR for this issue');
      if (pr.head.sha !== env.EXPECTED_HEAD_SHA) fail('Canonical PR head moved before worker startup');
      const { data: mainRef } = await github.rest.git.getRef({ owner, repo, ref: 'heads/main' });
      const baseCommit = mainRef.object.sha;
      if (!(await descends(baseCommit, pr.head.sha))) fail('Canonical PR does not include current main; update its branch first');

      // Independently re-check the native environment review and exact record
      // in every post-planning worker. A local file or environment name alone
      // never authorizes implementation.
      let approval = null;
      if (worker !== 'planner') {
        approval = JSON.parse(env.APPROVAL_JSON || 'null');
        if (!approval || approval.schema_version !== '1.0.0' ||
            approval.workflow_run_id !== context.runId || !Number.isSafeInteger(approval.run_attempt) ||
            approval.run_attempt < 1 || approval.run_attempt > Number(env.GITHUB_RUN_ATTEMPT) ||
            approval.environment_name !== 'implementation-approval' || !Number.isSafeInteger(approval.environment_id) || approval.environment_id < 1 ||
            approval.issue_number !== issue || approval.pr_number !== prNumber || approval.base_commit !== baseCommit ||
            !/^[0-9a-f]{40}$/.test(approval.approved_head_sha) ||
            !/^[0-9a-f]{64}$/.test(approval.spec_sha256) || !/^[0-9a-f]{64}$/.test(approval.plan_sha256) ||
            !/^[0-9a-f]{64}$/.test(approval.comments_sha256)) fail('Native approval record missing, stale or belongs to another run');
        const { data: reviews } = await github.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals',
          { owner, repo, run_id: context.runId });
        const matching = reviews.filter((r) => r.environments.some((e) =>
          e.id === approval.environment_id && e.name === approval.environment_name));
        if (matching.some((r) => r.state === 'rejected')) fail('Implementation environment approval was rejected');
        const review = matching.find((r) => r.state === 'approved' && r.user.login === approval.actor &&
          (r.comment || 'Approved implementation-approval in GitHub Actions') === approval.statement);
        if (!review || !(await isWriter(review.user))) fail('Native approval is absent or author lacks repository write permission');
        const { data: current } = await github.rest.issues.get({ owner, repo, issue_number: issue });
        const snapshotBytes = await file(`specs/issue-${issue}/issue-snapshot.json`, approval.approved_head_sha);
        if (!snapshotBytes.equals(await file(`specs/issue-${issue}/issue-snapshot.json`, pr.head.sha))) fail('Issue snapshot changed after approval');
        const snapshot = JSON.parse(snapshotBytes.toString('utf8'));
        if (current.state !== 'open' || current.pull_request || snapshot.number !== current.number ||
            snapshot.title !== current.title || snapshot.body !== current.body) fail('Issue changed after planning');
        const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: issue, per_page: 100 });
        const CONTROL = /^\/agent (?:plan|approve [0-9a-f]{40} [0-9a-f]{64})$/;
        const human = comments.filter((c) => c.user.type === 'User' && !CONTROL.test(c.body.trim()))
          .map((c) => ({ id: c.id, updated_at: c.updated_at, body: c.body }));
        if (sha256(JSON.stringify(human)) !== approval.comments_sha256) fail('Human decisions changed after approval');
        if (!(await descends(approval.approved_head_sha, pr.head.sha))) fail('PR head does not descend from the approved revision');
        for (const [kind, hash] of [['spec', approval.spec_sha256], ['plan', approval.plan_sha256]]) {
          if (sha256(await file(`specs/issue-${issue}/${kind}.md`, approval.approved_head_sha)) !== hash ||
              sha256(await file(`specs/issue-${issue}/${kind}.md`, pr.head.sha)) !== hash) fail(`${kind}.md changed after approval`);
        }
      }

      const remediation = Number(env.ATTEMPT) > 1 ? JSON.parse(env.REMEDIATION_JSON || '[]') : [];
      const agentContext = {
        schema_version: '1.0.0', worker, run_id: context.runId, issue_number: issue, pr_number: prNumber,
        branch: pr.head.ref, expected_head_sha: pr.head.sha, transition_id: env.TRANSITION_ID,
        base_commit: baseCommit, approval, remediation, attempt: Number(env.ATTEMPT) - 1,
      };
      fs.mkdirSync('/tmp/gh-aw', { recursive: true });
      fs.writeFileSync('/tmp/gh-aw/agent-context.json', JSON.stringify(agentContext));
      if (approval) fs.writeFileSync('/tmp/gh-aw/approval.json', JSON.stringify(approval));
      core.setOutput('branch', pr.head.ref);
      core.setOutput('head_sha', pr.head.sha);
- name: Check out pinned PR head
  env:
    BRANCH: ${{ steps.agent-prepare.outputs.branch }}
    HEAD_SHA: ${{ steps.agent-prepare.outputs.head_sha }}
  run: |
    # Hooks disabled; PR-provided setup scripts are never executed here.
    git -c core.hooksPath=/dev/null fetch --no-tags --depth=1 origin "$HEAD_SHA"
    git -c core.hooksPath=/dev/null checkout -B "$BRANCH" "$HEAD_SHA"
- name: Preserve validated worker context
  uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
  with:
    name: agent-context-${{ inputs.transition_id }}
    path: /tmp/gh-aw/agent-context.json
    if-no-files-found: error
    retention-days: 30
---
