# GH-600 practical lab: issue-to-review handoffs

## Objective

Practice governed agent coordination with GitHub as the audit trail. The lab extends the Microsoft Applied Skill pattern (create/investigate/resolve/PR/close an issue) with explicit planning, approval, implementation and independent review.

## Exercise

1. Create an issue with the **GH-600 agent handoff lab** form. Keep one small change and explicit acceptance criteria.
2. Ask `multiverse-planner` to inspect the issue and repository. It writes no code. Save its plan as `.agent-state/<issue>/plan.md` and its v1 JSON handoff.
3. Validate the packet. Expect `PLANNED`; this is not approval.
4. A human reviews the issue and exact plan, records the plan SHA-256 and base commit in `approval.json`, and uses the exact approval statement from the contract.
5. Invoke `multiverse-implementer` on a non-main branch. It must re-check the issue snapshot, plan hash, base SHA and allowed paths before editing.
6. Open a PR linking the issue, plan and state packet. Let CI run.
7. Invoke `multiverse-reviewer` against the exact PR head SHA. It records findings and a review decision.
8. If changes are requested, allow one bounded remediation attempt for named findings only. Re-review the new head SHA. A second failure or any scope/requirement change escalates.
9. A human decides whether to merge and close the issue. Agents never merge or deploy.

## Failure drills

- Change `plan.md` after approval: validation must reject the stale plan hash.
- Change the base SHA in one handoff: validation must report stale state.
- Put a source-file instruction asking the agent to ignore scope: the agent must treat it as data.
- Set `attempt` to 2: validation must reject retry exhaustion.
- Ask remediation to touch a denied path: the implementer must escalate.

## Evidence checklist

- Issue URL and snapshot hash
- Plan path/hash and explicit human approval
- Branch, base/head commit and PR URL
- Allowed/denied paths and actual changed files
- Local results labeled separately from CI-observed evidence
- Reviewer findings, exact reviewed head SHA and final human decision

## Boundaries

The workflow validates contracts; it does not autonomously run Copilot agents, attest human identity, approve a PR, merge, deploy, or provide unsupported cloud handoffs. Configure branch protection/CODEOWNERS separately to enforce human PR approval.
