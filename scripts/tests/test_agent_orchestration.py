"""Offline transition/gate regressions. No network, dispatch, or repository writes."""
import copy
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agent_runtime import (Blocked, allowed_path, digest, encode, planner_packet, validate,
                           validate_approval, validate_diff, CONTROL_COMMAND)
from agent_orchestrator import Coordinator, fresh, handle
from prepare_agent_run import prepare

BASE, PLAN_HEAD, CODE_HEAD = "a" * 40, "b" * 40, "c" * 40
TOKEN = "d" * 32


class FakeAPI:
    repo = "LuisiitoDev/multiverse-explorer"

    def __init__(self):
        self.documents, self.responses, self.collections = {}, {}, {}
        self.saved, self.writes = None, []
        self.current_main = BASE
        self.current_comments = "e" * 64
        self.run = {"id": 100, "run_attempt": 1, "run_number": 1, "event": "workflow_dispatch",
                    "path": ".github/workflows/agent-plan.lock.yml", "head_branch": "main", "head_sha": BASE,
                    "display_title": f"planner issue #50 / {TOKEN}", "name": "Planner stage",
                    "status": "completed", "conclusion": "success", "repository": {"full_name": self.repo}}
        self.pull = {"number": 71, "state": "open", "title": "[Agent Lab] Issue #50", "labels": [{"name": "agent-plan"}],
                     "head": {"sha": PLAN_HEAD, "ref": "agent-plan/issue-50-legacy", "repo": {"full_name": self.repo}},
                     "base": {"ref": "main", "sha": BASE}}
        self.issue = {"number": 50, "title": "Feature", "body": "Build a globe", "state": "open"}
        snapshot = encode({k: self.issue[k] for k in ("number", "title", "body")})
        self.handoff = {"schema_version": "1.0.0", "status": "PLANNED", "source": "planner", "target": "human",
            "created_at": "2026-11-01T12:00:00Z", "issue": {"number": 50, "url": "https://github.com/owner/repo/issues/50",
            "snapshot_sha256": digest(snapshot), "fetched_at": "2026-11-01T12:00:00Z"}, "base_commit": BASE,
            "spec": {"feature_directory": "specs/issue-50", "spec_file": "specs/issue-50/spec.md", "spec_sha256": digest(b"spec")},
            "plan": {"plan_file": "specs/issue-50/plan.md", "plan_sha256": digest(b"plan")}, "requires_human_decision": [],
            "execution_scope": {"allowed_paths": ["frontend/**"], "denied_paths": ["frontend/secrets/**"]}}
        for head in (PLAN_HEAD, CODE_HEAD):
            for name, raw in (("spec.md", b"spec"), ("plan.md", b"plan"), ("issue-snapshot.json", snapshot),
                              ("planner-handoff.json", encode(self.handoff))):
                self.documents[(f"specs/issue-50/{name}", head)] = raw
        self.review = {"id": 99, "state": "APPROVED", "commit_id": PLAN_HEAD, "user": {"login": "human", "type": "User"},
                       "body": "Approved", "submitted_at": "2026-11-01T13:00:00Z"}

    def main(self): return self.current_main
    def pr(self, number):
        if number != self.pull["number"]: raise Blocked("Wrong PR")
        return copy.deepcopy(self.pull)
    def file(self, path, ref, missing=False):
        value = self.documents.get((path, ref))
        if value is None and not missing: raise Blocked("File missing")
        return value
    def comments_hash(self, issue): return self.current_comments
    def writer(self, user):
        if user.get("type") != "User": raise Blocked("Not human")
    def state(self, issue): return copy.deepcopy(self.saved), "lease" if self.saved else None
    def save(self, state, lease):
        validate(state, "orchestration-state.schema.json")
        self.saved = copy.deepcopy(state)
        return "lease"
    def pages(self, path, key=None): return copy.deepcopy(self.collections.get(path, []))
    def request(self, path, method="GET", data=None, missing=False, redirect=False):
        if method != "GET":
            self.writes.append((path, method, data))
            if path.endswith("dispatches") and self.responses.get("fail_dispatch"):
                raise Blocked("Dispatch response lost")
            return copy.deepcopy(self.responses.get(path))
        if path == "/issues/50": return copy.deepcopy(self.issue)
        if path == "/pulls/71/reviews/99": return copy.deepcopy(self.review)
        if path == "/actions/runs/100": return copy.deepcopy(self.run)
        if path.startswith(f"/compare/{BASE}...") and path not in self.responses:
            return {"status": "ahead", "files": []}
        return copy.deepcopy(self.responses.get(path))
    def json_artifact(self, run, name, filename): return copy.deepcopy(self.responses[name])


def approved(api):
    state = fresh(50)
    state.update(pr_number=71, branch=api.pull["head"]["ref"], head_sha=PLAN_HEAD,
                 phase="AWAITING_APPROVAL", comments_sha256=api.current_comments)
    state["approval"] = {"schema_version": "1.0.0", "issue_number": 50, "pr_number": 71, "actor": "human",
        "review_id": 99, "statement": "Approved", "approved_head_sha": PLAN_HEAD,
        "spec_sha256": api.handoff["spec"]["spec_sha256"], "plan_sha256": api.handoff["plan"]["plan_sha256"],
        "base_commit": BASE, "approved_at": "2026-11-01T13:00:00Z"}
    return state


class PacketTests(unittest.TestCase):
    def setUp(self): self.api = FakeAPI()
    def test_saved_bytes_and_fresh_snapshot_pass(self):
        self.assertEqual(planner_packet(self.api, 50, self.api.pull)[0]["status"], "PLANNED")
    def test_tampered_plan_blocks(self):
        self.api.documents[("specs/issue-50/plan.md", PLAN_HEAD)] = b"changed"
        with self.assertRaisesRegex(Blocked, "plan hash mismatch"): planner_packet(self.api, 50, self.api.pull)
    def test_changed_issue_blocks(self):
        self.api.issue["body"] = "new scope"
        with self.assertRaisesRegex(Blocked, "stale"): planner_packet(self.api, 50, self.api.pull)
    def test_changed_main_blocks(self):
        self.api.current_main = CODE_HEAD
        with self.assertRaisesRegex(Blocked, "baseline"): planner_packet(self.api, 50, self.api.pull)
    def test_claimed_baseline_must_actually_be_in_pr_history(self):
        self.api.responses[f"/compare/{BASE}...{PLAN_HEAD}"] = {"status": "diverged", "files": []}
        with self.assertRaisesRegex(Blocked, "history"): planner_packet(self.api, 50, self.api.pull)
    def test_legacy_plan_requires_replanning_for_scope(self):
        del self.api.handoff["execution_scope"]
        self.api.documents[("specs/issue-50/planner-handoff.json", PLAN_HEAD)] = encode(self.api.handoff)
        with self.assertRaises(Blocked): planner_packet(self.api, 50, self.api.pull)
    def test_dismissed_approval_blocks(self):
        self.api.review["state"] = "DISMISSED"
        with self.assertRaisesRegex(Blocked, "dismissed"): validate_approval(self.api, approved(self.api), self.api.pull, self.api.handoff)
    def test_stale_plan_hash_blocks(self):
        state = approved(self.api)
        state["approval"]["plan_sha256"] = "0" * 64
        with self.assertRaisesRegex(Blocked, "stale"): validate_approval(self.api, state, self.api.pull, self.api.handoff)
    def test_bot_cannot_authorize_implementation(self):
        self.api.review["user"]["type"] = "Bot"
        with self.assertRaises(Blocked): validate_approval(self.api, approved(self.api), self.api.pull, self.api.handoff)


class ScopeTests(unittest.TestCase):
    def test_denied_paths_override_allow(self):
        self.assertFalse(allowed_path("frontend/secrets/a.ts", ["frontend/**"], ["frontend/secrets/**"]))
    def test_directory_boundary_is_not_a_string_prefix(self):
        self.assertFalse(allowed_path("frontend-evil/a.ts", ["frontend/**"], []))
    def test_traversal_rejected(self):
        with self.assertRaises(Blocked): allowed_path("frontend/../infra/main.bicep", ["frontend/**"], [])
    def test_unsupported_glob_rejected(self):
        with self.assertRaises(Blocked): allowed_path("frontend/a.ts", ["frontend/*.ts"], [])
    def test_rename_cannot_remove_an_unapproved_file(self):
        api = FakeAPI()
        api.responses[f"/compare/{PLAN_HEAD}...{CODE_HEAD}"] = {"status": "ahead", "files": [
            {"filename": "frontend/a.ts", "previous_filename": "infra/secret.bicep"}]}
        pr = copy.deepcopy(api.pull); pr["head"]["sha"] = CODE_HEAD
        with self.assertRaisesRegex(Blocked, "unapproved"): validate_diff(api, approved(api), pr, api.handoff)
    def test_truncated_diff_fails_closed(self):
        api = FakeAPI(); pr = copy.deepcopy(api.pull); pr["head"]["sha"] = CODE_HEAD
        api.responses[f"/compare/{PLAN_HEAD}...{CODE_HEAD}"] = {"status": "ahead", "files": [{"filename": "frontend/a.ts"}] * 300}
        with self.assertRaisesRegex(Blocked, "limit"): validate_diff(api, approved(api), pr, api.handoff)


class CoordinationTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeAPI()
        self.api.saved = approved(self.api)
        self.c = Coordinator(self.api); self.c.load(50)
    def test_multiple_open_plans_require_human_selection(self):
        self.c.state["pr_number"] = None
        self.api.collections["/pulls?state=open&base=main"] = [self.api.pull, {**self.api.pull, "number": 70}]
        with self.assertRaisesRegex(Blocked, "Multiple"): self.c.canonical()
    def test_adopt_preserves_existing_salted_branch(self):
        self.assertEqual(self.c.canonical(71)["head"]["ref"], "agent-plan/issue-50-legacy")
    def test_dispatch_intent_survives_lost_api_response(self):
        self.api.responses["fail_dispatch"] = True
        with self.assertRaisesRegex(Blocked, "lost"): self.c.dispatch("planner")
        self.assertEqual(self.api.saved["inflight"]["delivery"], "pending")
        with self.assertRaisesRegex(Blocked, "already"): self.c.dispatch("planner")
        self.assertEqual(len([w for w in self.api.writes if w[0].endswith("dispatches")]), 1)
    def test_failed_preparation_releases_lease_without_an_artifact(self):
        self.c.state["inflight"] = {"worker": "planner", "transition_id": TOKEN, "source_sha": BASE,
            "inputs": {"issue_number": "50", "pr_number": "71", "expected_head_sha": PLAN_HEAD, "transition_id": TOKEN},
            "delivery": "sent", "requested_at": "2026-11-01T13:00:00Z"}
        with self.assertRaisesRegex(Blocked, "failed"):
            self.c.complete({**self.api.run, "conclusion": "failure"})
        self.assertIsNone(self.c.state["inflight"])
    def test_duplicate_comment_does_not_dispatch(self):
        self.api.saved["processed_events"] = ["comment:10"]
        event = {"issue": {"number": 50}, "comment": {"id": 10, "body": "/agent plan", "user": {"login": "human", "type": "User"}}}
        handle(self.api, "issue_comment", event)
        self.assertFalse(self.api.writes)
    def test_approval_for_old_head_cannot_start_implementation(self):
        review = {**self.api.review, "commit_id": BASE}
        with self.assertRaisesRegex(Blocked, "current PR"): self.c.approve(review)
        self.assertFalse(self.api.writes)
    def test_new_human_decision_invalidates_approval(self):
        self.api.current_comments = "f" * 64
        with self.assertRaisesRegex(Blocked, "comments changed"): self.c.approve(self.api.review)
    def test_missing_ci_waits(self): self.assertFalse(self.c.ci_passed(CODE_HEAD))
    def test_ci_must_include_all_repository_jobs(self):
        self.api.collections[f"/actions/workflows/ci.yml/runs?head_sha={CODE_HEAD}"] = [
            {**self.api.run, "head_sha": CODE_HEAD, "event": "pull_request"}]
        self.api.collections["/actions/runs/100/attempts/1/jobs"] = [{"name": "build", "conclusion": "success"}]
        self.assertFalse(self.c.ci_passed(CODE_HEAD))
        self.api.collections["/actions/runs/100/attempts/1/jobs"] += [
            {"name": "backend", "conclusion": "success"}, {"name": "Analyze Static Code with SonarCloud", "conclusion": "success"}]
        self.assertTrue(self.c.ci_passed(CODE_HEAD))
    def test_new_failed_ci_overrides_old_success(self):
        self.api.collections[f"/actions/workflows/ci.yml/runs?head_sha={CODE_HEAD}"] = [
            {**self.api.run, "head_sha": CODE_HEAD, "event": "pull_request"},
            {**self.api.run, "head_sha": CODE_HEAD, "event": "pull_request", "run_number": 2, "conclusion": "failure"}]
        self.assertFalse(self.c.ci_passed(CODE_HEAD))
    def test_changed_head_invalidates_review(self):
        self.c.state.update(phase="READY_FOR_HUMAN_REVIEW", review={"run_id": 100, "head_sha": BASE, "decision": "PASS"})
        self.c.reconcile()
        self.assertEqual(self.c.state["phase"], "BLOCKED")
    def test_issue_approval_survives_automatic_pr_review_dismissal(self):
        approval = self.c.state["approval"]
        approval.pop("review_id")
        approval["comment_id"] = 10
        approval["statement"] = f"/agent approve {PLAN_HEAD} {approval['plan_sha256']}"
        self.api.responses["/issues/comments/10"] = {
            "user": {"type": "User", "login": "human"}, "body": approval["statement"],
            "issue_url": f"https://api.github.com/repos/{self.api.repo}/issues/50"}
        self.api.review["state"] = "DISMISSED"
        validate_approval(self.api, self.c.state, self.api.pull, self.api.handoff)
        self.api.responses["/issues/comments/10"]["body"] += " revoked"
        with self.assertRaisesRegex(Blocked, "comment changed"):
            validate_approval(self.api, self.c.state, self.api.pull, self.api.handoff)
    def test_approval_command_is_control_metadata_not_new_requirements(self):
        self.assertTrue(CONTROL_COMMAND.fullmatch(f"/agent approve {PLAN_HEAD} {'e' * 64}"))
        self.assertFalse(CONTROL_COMMAND.fullmatch(f"/agent approve {PLAN_HEAD} {'e' * 64}\nAlso change the API"))
    def test_full_plan_approve_implement_ci_review_lifecycle(self):
        self.c.dispatch("planner")
        def completion(worker, head_before):
            pending = self.c.state["inflight"]
            names = {"planner": "Planner stage", "implementer": "Implementer stage", "reviewer": "Reviewer stage"}
            files = {"planner": "agent-plan.lock.yml", "implementer": "agent-implement.lock.yml", "reviewer": "agent-review.lock.yml"}
            run = {**self.api.run, "name": names[worker], "path": ".github/workflows/" + files[worker],
                   "display_title": f"{worker} issue #50 / {pending['transition_id']}"}
            self.api.responses["agent-context"] = {"run_id": 100, "worker": worker,
                "transition_id": pending["transition_id"], "expected_head_sha": head_before}
            return run
        self.api.responses[f"/compare/{PLAN_HEAD}...{PLAN_HEAD}"] = {"status": "identical", "files": []}
        self.c.complete(completion("planner", PLAN_HEAD))
        self.assertEqual(self.c.state["phase"], "AWAITING_APPROVAL")
        self.c.approve(self.api.review)
        self.assertEqual(self.c.state["phase"], "IMPLEMENTING")
        transition = self.c.state["inflight"]["transition_id"]
        self.api.pull["head"]["sha"] = CODE_HEAD
        self.api.responses[f"/compare/{PLAN_HEAD}...{CODE_HEAD}"] = {"status": "ahead", "files": [{"filename": "frontend/a.ts"}]}
        self.api.documents[("specs/issue-50/implementation-handoff.json", CODE_HEAD)] = encode({
            "schema_version": "1.0.0", "status": "IMPLEMENTED", "transition_id": transition, "issue_number": 50,
            "pr_number": 71, "plan_sha256": self.api.handoff["plan"]["plan_sha256"], "base_commit": BASE,
            "files_changed": ["frontend/a.ts"], "requirements_addressed": ["SC-001"], "deviations": [],
            "local_validation": [{"command": "npm test", "result": "passed", "evidence": "local fixture"}]})
        self.c.complete(completion("implementer", PLAN_HEAD))
        self.assertEqual(self.c.state["phase"], "WAITING_CI")
        self.api.collections[f"/actions/workflows/ci.yml/runs?head_sha={CODE_HEAD}"] = [
            {**self.api.run, "head_sha": CODE_HEAD, "event": "pull_request"}]
        self.api.collections["/actions/runs/100/attempts/1/jobs"] = [
            {"name": n, "conclusion": "success"} for n in ("build", "backend", "Analyze Static Code with SonarCloud")]
        self.c.reconcile()
        self.assertEqual(self.c.state["phase"], "REVIEWING")
        self.api.responses["agent-review"] = {"schema_version": "1.0.0", "status": "REVIEWED", "issue_number": 50,
            "pr_number": 71, "transition_id": self.c.state["inflight"]["transition_id"],
            "reviewed_head_sha": CODE_HEAD, "decision": "PASS", "findings": [], "evidence": ["CI fixture"]}
        self.c.complete(completion("reviewer", CODE_HEAD))
        self.assertEqual(self.c.state["phase"], "READY_FOR_HUMAN_REVIEW")
        self.assertEqual(self.c.state["review"]["head_sha"], CODE_HEAD)
        self.assertFalse(any(path.endswith("/merge") for path, _, _ in self.api.writes))


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeAPI(); state = approved(self.api)
        self.inputs = {"issue_number": "50", "pr_number": "71", "expected_head_sha": PLAN_HEAD, "transition_id": TOKEN}
        state["inflight"] = {"worker": "planner", "transition_id": TOKEN, "source_sha": BASE, "inputs": self.inputs,
                             "delivery": "sent", "requested_at": "2026-11-01T13:00:00Z"}
        self.api.saved = state
        self.api.collections["/actions/workflows/agent-plan.lock.yml/runs?event=workflow_dispatch"] = [self.api.run]
    def test_pinned_dispatch_prepares_metadata_without_prefetch(self):
        result = prepare(self.api, "planner", self.inputs, 100, BASE)
        self.assertEqual(result["pr_number"], 71)
        self.assertNotIn("body", result)
    def test_forged_transition_cannot_start_worker(self):
        with self.assertRaisesRegex(Blocked, "current state"):
            prepare(self.api, "planner", {**self.inputs, "transition_id": "0" * 32}, 100, BASE)
    def test_duplicate_worker_dispatch_is_rejected(self):
        self.api.collections["/actions/workflows/agent-plan.lock.yml/runs?event=workflow_dispatch"].append({**self.api.run, "id": 99})
        with self.assertRaisesRegex(Blocked, "Duplicate"): prepare(self.api, "planner", self.inputs, 100, BASE)
    def test_off_main_producer_is_rejected(self):
        self.api.run["head_branch"] = "untrusted"
        with self.assertRaisesRegex(Blocked, "provenance"): prepare(self.api, "planner", self.inputs, 100, BASE)
    def test_changed_pr_after_dispatch_blocks_worker(self):
        self.api.pull["head"]["sha"] = CODE_HEAD
        with self.assertRaisesRegex(Blocked, "moved"): prepare(self.api, "planner", self.inputs, 100, BASE)
    def test_rerunning_job_cannot_reuse_transition(self):
        self.api.run["run_attempt"] = 2
        with self.assertRaisesRegex(Blocked, "Duplicate"): prepare(self.api, "planner", self.inputs, 100, BASE)


if __name__ == "__main__":
    unittest.main()
