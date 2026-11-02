"""Deterministic coordinator; GitHub is the durable system of record.

No LLM, builds, artifact execution, PR merges, deployments or force pushes.
All writes are fixed API operations on this repository's state branch/comments
and an allowlist of three worker workflow dispatches on main.
"""
from __future__ import annotations

import datetime as dt
import base64
import json
import os
import re
import uuid

from agent_runtime import (Blocked, GitHub, WORKFLOWS, digest, encode,
                           planner_packet, require, validate, validate_approval, validate_diff)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def fresh(issue):
    return {"schema_version": "1.0.0", "issue_number": issue, "revision": 0, "phase": "NEW",
            "pr_number": None, "branch": None, "head_sha": None, "approval": None,
            "inflight": None, "attempt": 0, "processed_events": [], "history": [],
            "comments_sha256": None, "handoff_sha256": None, "last_worker": None,
            "blocker": None}


class Coordinator:
    def __init__(self, api):
        self.api = api
        self.state = None
        self.lease = None

    def load(self, issue):
        require(type(issue) is int and issue > 0, "Invalid issue number")
        self.state, self.lease = self.api.state(issue)
        if self.state is None:
            self.state = fresh(issue)

    def save(self, reason):
        self.state["revision"] += 1
        self.state["history"] = (self.state["history"] + [{"at": now(), "phase": self.state["phase"],
                                "reason": reason, "run_id": os.environ.get("GITHUB_RUN_ID", "local")}])[-50:]
        self.lease = self.api.save(self.state, self.lease)

    def comment(self, body):
        issue = self.state["issue_number"]
        self.api.request(f"/issues/{issue}/comments", "POST", {"body": "<!-- agent-orchestrator -->\n" + body})

    def canonical(self, adopt=None):
        issue = self.state["issue_number"]
        number = adopt or self.state["pr_number"]
        if number:
            pr = self.api.pr(number)
            require(pr["head"]["ref"].startswith(f"agent-plan/issue-{issue}-") or
                    pr["head"]["ref"] == f"agent-plan/issue-{issue}", "PR branch belongs to another issue")
            snapshot = self.api.file(f"specs/issue-{issue}/issue-snapshot.json", pr["head"]["sha"], missing=True)
            identity = json.loads(snapshot)["number"] if snapshot else json.loads(
                self.api.file(f"specs/issue-{issue}/task.json", pr["head"]["sha"]))["issue_number"]
            require(identity == issue, "PR snapshot belongs to another issue")
        else:
            candidates = [p for p in self.api.pages("/pulls?state=open&base=main")
                          if (p["head"]["ref"] == f"agent-plan/issue-{issue}" or
                              p["head"]["ref"].startswith(f"agent-plan/issue-{issue}-")) and
                          p["title"].startswith("[Agent Lab] ") and
                          "agent-plan" in {label["name"] for label in p["labels"]}]
            require(len(candidates) <= 1, "Multiple planning PRs; use /agent adopt <PR number> on the issue")
            pr = self.api.pr(candidates[0]["number"]) if candidates else None
        if pr:
            self.state.update(pr_number=pr["number"], branch=pr["head"]["ref"], head_sha=pr["head"]["sha"])
        return pr

    def create_canonical(self):
        issue = self.state["issue_number"]
        source = self.api.request(f"/issues/{issue}")
        require(source["state"] == "open" and "pull_request" not in source, "Originating issue must be open")
        branch = f"agent-plan/issue-{issue}"
        require(self.api.request(f"/git/ref/heads/{branch}", missing=True) is None,
                "Planning branch already exists without a canonical PR; inspect it before recovery")
        self.api.request("/git/refs", "POST", {"ref": "refs/heads/" + branch, "sha": self.api.main()})
        # A PR requires a non-empty diff. This data-only seed identifies the task;
        # it does not prefetch requirements or replace the Planner's MCP reads.
        self.api.request(f"/contents/specs/issue-{issue}/task.json", "PUT", {
            "branch": branch, "message": f"Initialize agent task for issue #{issue}",
            "content": base64.b64encode(encode({"issue_number": issue})).decode()})
        pr = self.api.request("/pulls", "POST", {"title": f"[Agent Lab] Issue #{issue}", "head": branch,
            "base": "main", "draft": True, "body": f"Related issue: #{issue}\n\nCanonical agent work PR. Planning pending; no implementation approval."})
        self.api.request(f"/issues/{pr['number']}/labels", "POST", {"labels": ["agent-plan"]})
        self.state.update(pr_number=pr["number"], branch=branch, head_sha=pr["head"]["sha"])
        self.save("Created canonical draft PR before running Planner")
        return self.api.pr(pr["number"])

    def dispatch(self, worker):
        require(self.state["inflight"] is None, "An agent execution is already pending or active")
        pr = self.canonical()
        if pr is None:
            require(worker == "planner", "Only planning may initialize a canonical PR")
            pr = self.create_canonical()
        source_sha = self.api.main()
        if worker == "planner":
            ancestry = self.api.request(f"/compare/{source_sha}...{pr['head']['sha']}")
            require(ancestry["status"] in ("ahead", "identical"),
                    "Update the canonical PR branch with current main before replanning")
        if worker != "planner":
            require(pr, "Canonical PR missing")
            handoff, handoff_hash = planner_packet(self.api, self.state["issue_number"], pr)
            validate_approval(self.api, self.state, pr, handoff)
            require(self.api.comments_hash(self.state["issue_number"]) == self.state["comments_sha256"],
                    "Human comments changed after planning; replan before implementation")
            if worker == "implementer" and self.state["attempt"] == 0:
                require(pr["head"]["sha"] == self.state["approval"]["approved_head_sha"],
                        "PR head moved after approval")
            if worker == "reviewer":
                validate_diff(self.api, self.state, pr, handoff)
                require(self.ci_passed(pr["head"]["sha"]), "Required CI has not passed for this head")
            elif self.state["attempt"] == 1:
                scope = handoff["execution_scope"]
                from agent_runtime import allowed_path
                require(self.state.get("remediation"), "Remediation findings missing")
                require(all(f["path"] and allowed_path(f["path"], scope["allowed_paths"], scope["denied_paths"])
                            for f in self.state["remediation"] if f["severity"] in ("Blocker", "Major")),
                        "Reviewer finding requires new scope; human/planner decision required")
            self.state["handoff_sha256"] = handoff_hash
        else:
            self.state["approval"] = None
            self.state["attempt"] = 0
            self.state["comments_sha256"] = self.api.comments_hash(self.state["issue_number"])
        transition = uuid.uuid4().hex
        inputs = {"issue_number": str(self.state["issue_number"]), "pr_number": str(pr["number"] if pr else 0),
                  "expected_head_sha": pr["head"]["sha"] if pr else source_sha, "transition_id": transition}
        self.state["inflight"] = {"worker": worker, "transition_id": transition, "source_sha": source_sha,
                                  "inputs": inputs, "delivery": "pending", "requested_at": now()}
        self.state["phase"] = {"planner": "PLANNING", "implementer": "IMPLEMENTING", "reviewer": "REVIEWING"}[worker]
        self.state["last_worker"] = worker
        self.state["blocker"] = None
        self.save("Persist dispatch intent before invoking worker")
        # Never retry an ambiguous dispatch. /agent recover discovers the run by
        # transition ID; a lost response cannot create duplicate executions.
        self.api.request(f"/actions/workflows/{WORKFLOWS[worker]}/dispatches", "POST", {"ref": "main", "inputs": inputs})
        self.state["inflight"]["delivery"] = "sent"
        self.save("Worker dispatch accepted")

    def ci_passed(self, head):
        runs = self.api.pages(f"/actions/workflows/ci.yml/runs?head_sha={head}", "workflow_runs")
        runs = [r for r in runs if r["head_sha"] == head and r["event"] in ("pull_request", "push", "workflow_dispatch")]
        if not runs:
            return False
        latest = max(runs, key=lambda r: (r["run_number"], r["run_attempt"]))
        if latest["status"] != "completed" or latest["conclusion"] != "success":
            return False
        jobs = self.api.pages(f"/actions/runs/{latest['id']}/attempts/{latest['run_attempt']}/jobs", "jobs")
        required = {"build", "backend", "Analyze Static Code with SonarCloud"}
        return required <= {j["name"] for j in jobs if j["conclusion"] == "success"}

    def complete(self, run):
        pending = self.state["inflight"]
        require(pending, "Completion has no pending transition")
        worker = pending["worker"]
        require(run["event"] == "workflow_dispatch" and run["head_branch"] == "main" and
                run["path"] == ".github/workflows/" + WORKFLOWS[worker] and
                run["display_title"] == f"{worker} issue #{self.state['issue_number']} / {pending['transition_id']}",
                "Worker provenance mismatch")
        # A trusted pre-step can fail before uploading any artifact. Terminal
        # metadata alone is enough to release its lease, never to advance work.
        if run["conclusion"] != "success" or run["head_sha"] != pending["source_sha"]:
            self.state["inflight"] = None
            raise Blocked(f"{worker} run {run['id']} failed or used a different source revision; inspect Actions and request fresh planning")
        context = self.api.json_artifact(run["id"], "agent-context", "agent-context.json")
        require(context["transition_id"] == pending["transition_id"] and
                context["run_id"] == run["id"] and context["worker"] == worker and
                context["expected_head_sha"] == pending["inputs"]["expected_head_sha"],
                "Worker context mismatch")
        self.state["inflight"] = None
        pr = self.canonical()
        require(pr, "Worker did not publish a canonical PR")
        if worker == "planner":
            # A planner may publish only planning files, including when it
            # resumes on a PR that already contains implementation commits.
            comparison = self.api.request(f"/compare/{context['expected_head_sha']}...{pr['head']['sha']}")
            files = comparison.get("files", [])
            require(comparison["status"] in ("ahead", "identical") and len(files) < 300,
                    "Planner changed history or diff is incomplete")
            for file in files:
                for path in {file["filename"], file.get("previous_filename", file["filename"])}:
                    require(path.startswith(f"specs/issue-{self.state['issue_number']}/") or
                            path == ".specify/feature.json", "Planner modified files outside planning scope")
            handoff, handoff_hash = planner_packet(self.api, self.state["issue_number"], pr, False)
            require(self.api.comments_hash(self.state["issue_number"]) == self.state["comments_sha256"],
                    "Human answers changed during planning; run /agent plan to reconcile")
            self.state["handoff_sha256"] = handoff_hash
            self.state["phase"] = {"PLANNED": "AWAITING_APPROVAL", "NEEDS_CLARIFICATION": "NEEDS_CLARIFICATION",
                                   "BLOCKED": "BLOCKED"}[handoff["status"]]
            if handoff["status"] == "PLANNED":
                planner_packet(self.api, self.state["issue_number"], pr)
            self.save("Validated published planner artifacts")
            self.comment(f"Planner: **{handoff['status']}** on PR #{pr['number']}. " +
                         ("Review the spec/plan, then authorize this exact revision with an issue comment:\n\n"
                          f"`/agent approve {pr['head']['sha']} {handoff['plan']['plan_sha256']}`"
                          if handoff["status"] == "PLANNED" else "Answer on this issue; a human reply resumes the same PR."))
        elif worker == "implementer":
            handoff, _ = planner_packet(self.api, self.state["issue_number"], pr)
            validate_approval(self.api, self.state, pr, handoff)
            validate_diff(self.api, self.state, pr, handoff)
            report = json.loads(self.api.file(f"specs/issue-{self.state['issue_number']}/implementation-handoff.json",
                                             pr["head"]["sha"]))
            validate(report, "implementation.schema.json")
            require(report["transition_id"] == pending["transition_id"] and report["status"] == "IMPLEMENTED" and
                    report["issue_number"] == self.state["issue_number"] and report["pr_number"] == pr["number"] and
                    report["plan_sha256"] == self.state["approval"]["plan_sha256"], "Implementation report mismatch")
            require(report["base_commit"] == handoff["base_commit"] and report["local_validation"] and
                    all(check["result"] == "passed" for check in report["local_validation"]),
                    "Implementation lacks passing local validation evidence")
            self.state["phase"] = "WAITING_CI"
            self.save("Implementation published; remote PR head is authoritative, not local commit SHA")
            self.reconcile()
        else:
            require(pr["head"]["sha"] == pending["inputs"]["expected_head_sha"], "PR changed during review")
            report = self.api.json_artifact(run["id"], "agent-review", "review-handoff.json")
            validate(report, "review.schema.json")
            require(report["transition_id"] == pending["transition_id"] and report["reviewed_head_sha"] == pr["head"]["sha"] and
                    report["issue_number"] == self.state["issue_number"] and report["pr_number"] == pr["number"],
                    "Review report identity mismatch")
            handoff, _ = planner_packet(self.api, self.state["issue_number"], pr)
            validate_approval(self.api, self.state, pr, handoff)
            require(self.ci_passed(pr["head"]["sha"]), "CI changed or no longer passes for reviewed head")
            require(report["decision"] != "PASS" or not any(f["severity"] in ("Blocker", "Major") for f in report["findings"]),
                    "PASS contradicts blocking review findings")
            require(report["decision"] != "REQUEST_CHANGES" or any(f["severity"] in ("Blocker", "Major") for f in report["findings"]),
                    "REQUEST_CHANGES lacks an actionable blocking finding")
            self.state["review"] = {"run_id": run["id"], "head_sha": pr["head"]["sha"], "decision": report["decision"]}
            if report["decision"] == "REQUEST_CHANGES" and self.state["attempt"] == 0:
                self.state["attempt"] = 1
                self.state["remediation"] = report["findings"]
                self.save("One scoped remediation permitted")
                self.dispatch("implementer")
            else:
                self.state["phase"] = {"PASS": "READY_FOR_HUMAN_REVIEW", "REQUEST_CHANGES": "ESCALATED",
                                       "BLOCKED": "BLOCKED", "ESCALATED": "ESCALATED"}[report["decision"]]
                self.save("Review completed; never merge automatically")
                self.comment(f"Reviewer: **{report['decision']}** for `{pr['head']['sha']}`. "
                             f"Evidence: https://github.com/{self.api.repo}/actions/runs/{run['id']}. Human owns the next decision.")

    def approve(self, review):
        require(self.state["phase"] == "AWAITING_APPROVAL" and not self.state["inflight"], "Not awaiting plan approval")
        self.api.writer(review["user"])
        pr = self.canonical()
        require(review["state"].upper() == "APPROVED" and review["commit_id"] == pr["head"]["sha"],
                "Approval must address the current PR revision")
        handoff, _ = planner_packet(self.api, self.state["issue_number"], pr)
        require(self.api.comments_hash(self.state["issue_number"]) == self.state["comments_sha256"],
                "Human comments changed after planning; replan")
        self.state["approval"] = {"schema_version": "1.0.0", "issue_number": self.state["issue_number"],
            "pr_number": pr["number"], "actor": review["user"]["login"], "review_id": review["id"],
            "statement": review.get("body") or "APPROVED GitHub PR review", "approved_head_sha": review["commit_id"],
            "spec_sha256": handoff["spec"]["spec_sha256"], "plan_sha256": handoff["plan"]["plan_sha256"],
            "base_commit": handoff["base_commit"], "approved_at": review["submitted_at"]}
        self.save("Record independently fetched human PR review and exact artifact hashes")
        self.dispatch("implementer")

    def approve_comment(self, comment):
        require(self.state["phase"] == "AWAITING_APPROVAL" and not self.state["inflight"], "Not awaiting plan approval")
        self.api.writer(comment["user"])
        pr = self.canonical()
        handoff, _ = planner_packet(self.api, self.state["issue_number"], pr)
        require(comment["body"].strip() == f"/agent approve {pr['head']['sha']} {handoff['plan']['plan_sha256']}",
                "Approval command must identify the current head and plan hash")
        require(self.api.comments_hash(self.state["issue_number"]) == self.state["comments_sha256"],
                "Human decisions changed after planning; replan")
        self.state["approval"] = {"schema_version": "1.0.0", "issue_number": self.state["issue_number"],
            "pr_number": pr["number"], "actor": comment["user"]["login"], "comment_id": comment["id"],
            "statement": comment["body"], "approved_head_sha": pr["head"]["sha"],
            "spec_sha256": handoff["spec"]["spec_sha256"], "plan_sha256": handoff["plan"]["plan_sha256"],
            "base_commit": handoff["base_commit"], "approved_at": comment["created_at"]}
        self.save("Record human issue approval bound to exact head and plan hash")
        self.dispatch("implementer")

    def reconcile(self):
        require(not self.state["inflight"], "Pending execution: use /agent recover after an interrupted dispatch")
        pr = self.canonical()
        if self.state["phase"] == "WAITING_CI" and pr and self.ci_passed(pr["head"]["sha"]):
            self.dispatch("reviewer")
        elif self.state.get("review") and pr and self.state["review"]["head_sha"] != pr["head"]["sha"]:
            self.state["phase"] = "BLOCKED"
            self.state["blocker"] = "Reviewed PR head changed; replan or explicitly reconcile the new revision"
            self.save("Invalidated stale review")

    def recover(self):
        pending = self.state["inflight"]
        require(pending, "No pending dispatch to recover")
        runs = self.api.pages(f"/actions/workflows/{WORKFLOWS[pending['worker']]}/runs?event=workflow_dispatch", "workflow_runs")
        expected = f"{pending['worker']} issue #{self.state['issue_number']} / {pending['transition_id']}"
        matches = [r for r in runs if r["display_title"] == expected and r["head_sha"] == pending["source_sha"]]
        require(len(matches) == 1, "Dispatch result absent or ambiguous; inspect Actions before starting new work")
        if matches[0]["status"] == "completed":
            self.complete(matches[0])

    def reset(self):
        """Human-only abandonment of an orphaned/terminal transition.

        Reset does not dispatch, reopen/delete PRs, alter refs, or authorize
        implementation. Keep canonical identity and audit/event history. The
        entry routes independently verify the human's repository write role.
        """
        issue = self.state["issue_number"]
        for worker, workflow in WORKFLOWS.items():
            runs = self.api.pages(f"/actions/workflows/{workflow}/runs?event=workflow_dispatch", "workflow_runs")
            title = re.compile(rf"{worker} issue #{issue} / [0-9a-f]{{32}}")
            for run in runs:
                if not title.fullmatch(run.get("display_title", "")):
                    continue
                require(run.get("path") == ".github/workflows/" + workflow and
                        run.get("event") == "workflow_dispatch" and run.get("head_branch") == "main",
                        "Cannot reset: matching worker metadata is not verifiable")
                require(run.get("status") == "completed",
                        f"Cannot reset: {worker} run {run['id']} is still active; finish or cancel it in Actions first")
        pending = self.state["inflight"]
        identity = pending["transition_id"] if pending else "none"
        source = pending["source_sha"] if pending else "none"
        self.state.update(phase="NEW", inflight=None, approval=None, attempt=0,
                          blocker=None, handoff_sha256=None, comments_sha256=None, last_worker=None)
        self.state.pop("review", None)
        self.state.pop("remediation", None)
        self.save(f"Human reset abandoned transition {identity}; source={source}; canonical PR={self.state['pr_number']}")
        self.comment("Coordinator reset recorded; no agent was started. Canonical PR identity and history were preserved. "
                     "If its PR was closed, reopen it or select another open PR with `/agent adopt <number>`. "
                     "Then update the branch with main if needed and use `/agent plan`.")


def handle(api, event_name, event):
    coordinator = Coordinator(api)
    if event_name == "workflow_run":
        run = api.request(f"/actions/runs/{event['workflow_run']['id']}")
        require(run["repository"]["full_name"].lower() == api.repo.lower(), "Foreign workflow run")
        match = re.fullmatch(r"(planner|implementer|reviewer) issue #(\d+) / ([0-9a-f]{32})", run["display_title"])
        if not match:  # A CI completion may unblock one of the tracked issues.
            if run["path"] != ".github/workflows/ci.yml":
                return
            listing = api.request("/contents/.agent-state?ref=agent-orchestration-state", missing=True) or []
            for file in listing:
                name = re.fullmatch(r"issue-(\d+)\.json", file["name"])
                if name:
                    coordinator.load(int(name[1]))
                    if (not coordinator.state["inflight"] and
                            ((coordinator.state["phase"] == "WAITING_CI" and coordinator.state["head_sha"] == run["head_sha"]) or
                             (coordinator.state["phase"] == "READY_FOR_HUMAN_REVIEW" and coordinator.state.get("review")))):
                        coordinator.reconcile()
            return
        coordinator.load(int(match[2]))
        if not coordinator.state["inflight"] or coordinator.state["inflight"]["transition_id"] != match[3]:
            return  # Duplicate or superseded callback.
        action = lambda: coordinator.complete(run)
        key = f"run:{run['id']}:{run['run_attempt']}"
    elif event_name == "pull_request_review":
        pr = event["pull_request"]
        branch = re.match(r"agent-plan/issue-(\d+)(?:-|$)", pr["head"]["ref"])
        if not branch or event["review"]["state"].lower() != "approved":
            return
        coordinator.load(int(branch[1]))
        if coordinator.state["pr_number"] != pr["number"] or coordinator.state["phase"] != "AWAITING_APPROVAL":
            return
        review = api.request(f"/pulls/{pr['number']}/reviews/{event['review']['id']}")
        action = lambda: coordinator.approve(review)
        key = f"review:{review['id']}"
    else:
        if event_name == "issues":
            if event.get("label", {}).get("name") != "agent-lab" or "pull_request" in event["issue"]:
                return
            api.writer(event["sender"])
            issue, command = event["issue"]["number"], "plan"
            key = f"label:{issue}:{os.environ.get('GITHUB_RUN_ID')}"
        elif event_name == "issue_comment":
            if "pull_request" in event["issue"] or event["comment"]["user"]["type"] != "User":
                return
            issue = event["issue"]["number"]
            api.writer(event["comment"]["user"])
            coordinator.load(issue)
            body = event["comment"]["body"].strip()
            match = re.fullmatch(r"/agent (plan|reconcile|recover|reset|adopt [1-9][0-9]*|approve [0-9a-f]{40} [0-9a-f]{64})", body)
            if not match and coordinator.state["phase"] != "NEEDS_CLARIFICATION":
                return
            command = match[1] if match else "plan"
            key = f"comment:{event['comment']['id']}"
        else:
            api.writer(event["sender"])
            issue = int(event["inputs"]["issue_number"])
            command = event["inputs"].get("action", "reconcile")
            if command == "adopt":
                command += " " + str(int(event["inputs"]["pr_number"]))
            key = f"manual:{os.environ.get('GITHUB_RUN_ID')}"
        coordinator.load(issue)
        def action():
            require(not coordinator.state["inflight"] or command in ("recover", "reset"),
                    "A recorded transition still owns this issue. Use /agent recover; if its run was deleted, use /agent reset. "
                    "Applying the label again does not recover state.")
            if command.startswith("adopt "):
                coordinator.canonical(int(command.split()[1]))
                coordinator.state.update(phase="NEW", approval=None)
                coordinator.save("Human selected canonical PR; no duplicates closed automatically")
                coordinator.comment(f"Canonical PR is #{coordinator.state['pr_number']}. Use `/agent plan` to resume it.")
            elif command.startswith("approve "):
                comment = api.request(f"/issues/comments/{event['comment']['id']}")
                coordinator.approve_comment(comment)
            elif command == "plan":
                coordinator.dispatch("planner")
            elif command == "recover":
                coordinator.recover()
            elif command == "reset":
                coordinator.reset()
            elif command == "reconcile":
                coordinator.reconcile()
            else:
                raise Blocked("Unknown coordinator command")
    if key in coordinator.state["processed_events"]:
        return
    try:
        action()
    except Blocked as error:
        coordinator.state["phase"] = "BLOCKED"
        coordinator.state["blocker"] = str(error)[:1000]
        coordinator.save("Gate blocked transition")
        coordinator.comment("**BLOCKED:** " + str(error)[:1000])
        raise
    finally:
        coordinator.state["processed_events"] = (coordinator.state["processed_events"] + [key])[-100:]
        coordinator.save("Record processed event")


if __name__ == "__main__":
    try:
        with open(os.environ["GITHUB_EVENT_PATH"]) as source:
            handle(GitHub(), os.environ["GITHUB_EVENT_NAME"], json.load(source))
    except Blocked as error:
        print("Coordinator blocked:", str(error)[:1000])
        raise SystemExit(1)
