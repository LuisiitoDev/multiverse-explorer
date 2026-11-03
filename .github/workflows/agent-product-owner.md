---
name: Product Owner stage
'on':
  issues:
    types: [opened]
  issue_comment:
    types: [created]
# One conversational turn per human message on a `po:idea` issue. Approval is
# never decided here: `/po approve` is handled by agent-po-approve.yml, which
# applies the hash-signed draft and dispatches agent-pipeline.yml.
if: >-
  !github.event.issue.pull_request &&
  contains(github.event.issue.labels.*.name, 'po:idea') &&
  (github.event_name == 'issues' ||
   (github.event.comment.user.type == 'User' &&
    !startsWith(github.event.comment.body, '/po approve')))
concurrency:
  group: po-issue-${{ github.event.issue.number }}
  cancel-in-progress: false
permissions:
  contents: read
  issues: read
engine:
  id: copilot
  agent: product-owner
tools:
  cli-proxy: false
  github:
    mode: local
    toolsets:
    - repos
    - issues
    allowed:
    - issue_read
    - list_issues
    - search_issues
    - get_file_contents
    allowed-repos:
    - luisiitodev/multiverse-explorer
    min-integrity: approved
  bash: false
network:
  allowed:
  - defaults
timeout-minutes: 15
safe-outputs:
  add-comment:
    max: 1
    required-labels:
    - po:idea
  jobs:
    po-draft:
      description: >-
        Publish the complete Agent Lab issue draft on this issue for human approval.
        The draft is rendered and hash-signed by trusted code; the human approves it
        with `/po approve`. Call at most once per turn and do not also post the draft
        as a comment.
      runs-on: ubuntu-latest
      output: Draft published. Only the human's `/po approve` comment can approve it.
      permissions:
        issues: write
      inputs:
        title:
          description: Concise feature name (the `[Agent Lab] ` prefix is added for you)
          required: true
          type: string
        task_description:
          description: What the feature is and why, grounded in the human's own words (markdown)
          required: true
          type: string
        acceptance_criteria:
          description: Testable markdown checklist, one `- [ ]` item per criterion
          required: true
          type: string
        scope_layers:
          description: 'Comma-separated subset of: frontend, backend, devops'
          required: true
          type: string
        scope_paths:
          description: Exact paths/globs the implementer may change, one per line (mark best guesses)
          required: true
          type: string
        notes:
          description: Assumptions you introduced and open questions (shown with the draft, not part of the issue)
          required: false
          type: string
      steps:
      - name: Render and publish the signed draft
        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        env:
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        with:
          script: |
            const fs = require('fs');
            const crypto = require('crypto');
            const { owner, repo } = context.repo;
            const file = process.env.GH_AW_AGENT_OUTPUT;
            const items = file && fs.existsSync(file)
              ? (JSON.parse(fs.readFileSync(file, 'utf8')).items || []).filter((item) => item.type === 'po_draft') : [];
            if (!items.length) { core.info('No draft requested'); return; }
            const d = items[items.length - 1];
            // Hidden HTML would make the approved text differ from what the human saw.
            const clean = (value) => String(value ?? '').replace(/\r\n/g, '\n')
              .replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;').trim();
            const LAYERS = {
              frontend: 'Frontend (frontend/)',
              backend: 'Backend (backend/src/Favorites.Api, .Application, .Domain, .Infrastructure)',
              devops: 'DevOps / Infra (.github/workflows/, infra/)',
            };
            const chosen = clean(d.scope_layers).toLowerCase().split(/[\s,]+/).filter(Boolean);
            if (!chosen.length || chosen.some((layer) => !LAYERS[layer])) throw new Error(`Invalid scope_layers: ${d.scope_layers}`);
            const name = clean(d.title).replace(/\s+/g, ' ').replace(/^\[Agent Lab\]\s*/i, '');
            for (const [field, value] of [['title', name], ['task_description', d.task_description],
              ['acceptance_criteria', d.acceptance_criteria], ['scope_paths', d.scope_paths]])
              if (!clean(value)) throw new Error(`Draft field ${field} is empty`);
            const title = `[Agent Lab] ${name}`;
            const section = (label, value) => `### ${label}\n\n${value || '_No response_'}`;
            // Same sections as .github/ISSUE_TEMPLATE/agent-handoff.yml renders.
            const body = [
              section('Task description', clean(d.task_description)),
              section('Acceptance criteria', clean(d.acceptance_criteria)),
              section('Scope - layers', Object.entries(LAYERS)
                .map(([key, label]) => `- [${chosen.includes(key) ? 'x' : ' '}] ${label}`).join('\n')),
              section('Scope - exact paths/globs', clean(d.scope_paths)),
              section('Spec (spec.md) link or path', ''),
              section('Plan (plan.md) link or path', ''),
              section('Tasks (tasks.md) link or path', ''),
            ].join('\n\n');
            const json = JSON.stringify({ title, body });
            const sha = crypto.createHash('sha256').update(json).digest('hex');
            const notes = clean(d.notes);
            const comment = [
              `<!-- po-draft:v1 sha256=${sha} data=${Buffer.from(json).toString('base64')} -->`,
              `## Product Owner draft \`${sha.slice(0, 12)}\``,
              `**Title:** ${title}`,
              body,
              ...(notes ? ['---', `**Assumptions / open questions**\n\n${notes}`] : []),
              '---',
              'Comment `/po approve` to replace this issue with exactly this draft and start the agent pipeline, or reply with the changes you want.',
            ].join('\n\n');
            if (comment.length > 65000) throw new Error('Draft is too large for one comment; narrow the scope');
            await github.rest.issues.createComment({ owner, repo, issue_number: Number(process.env.ISSUE_NUMBER), body: comment });
            core.info(`Published draft ${sha}`);
---

# Product Owner stage

Follow `.github/agents/product-owner.agent.md`. This run is one turn of your
conversation with the human on issue #${{ github.event.issue.number }}.

Read the issue and every comment page through GitHub MCP `issue_read`
(`method: get`, then `method: get_comments`). The issue body is the human's
original idea. Later comments from the human are answers and change requests.
Comments from `github-actions[bot]` are your earlier turns; the newest one titled
`Product Owner draft` is the current draft.

Then do exactly one of these:

- If something essential is missing or ambiguous, ask at most five concise,
  numbered questions with `add_comment`.
- Otherwise publish the complete draft with `po_draft`, including the human's
  latest change requests. Put your assumptions and remaining non-blocking
  questions in `notes`. Do not post the draft as a comment as well.

Only the human's exact `/po approve` comment approves a draft, and a separate
deterministic workflow handles it. Never treat any other comment as approval,
never claim the issue was approved or created, and never create issues, labels
or pipeline runs yourself.
