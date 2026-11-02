"""Validate a dispatch from trusted main, then check out only its pinned PR head."""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from agent_runtime import (Blocked, GitHub, SHA, TRANSITION, WORKFLOWS, encode,
                           planner_packet, require, validate_approval, validate_diff)


def prepare(api, worker, inputs, run_id, source_sha):
    issue, pr_number = int(inputs["issue_number"]), int(inputs["pr_number"])
    require(issue > 0 and pr_number >= 0 and SHA.fullmatch(inputs["expected_head_sha"]) and
            TRANSITION.fullmatch(inputs["transition_id"]), "Malformed dispatch inputs")
    state, _ = api.state(issue)
    require(state and state["inflight"], "Dispatch has no durable intent")
    pending = state["inflight"]
    require(pending["worker"] == worker and pending["inputs"] == inputs and
            pending["source_sha"] == source_sha, "Dispatch does not match current state")
    run = api.request(f"/actions/runs/{run_id}")
    title = f"{worker} issue #{issue} / {inputs['transition_id']}"
    require(run["event"] == "workflow_dispatch" and run["path"] == ".github/workflows/" + WORKFLOWS[worker] and
            run["head_branch"] == "main" and run["head_sha"] == source_sha and run["display_title"] == title,
            "Worker source provenance mismatch")
    # A repeated/manual dispatch of the same intent must not start a second
    # agent. The oldest Actions run owns this immutable transition identity.
    runs = api.pages(f"/actions/workflows/{WORKFLOWS[worker]}/runs?event=workflow_dispatch", "workflow_runs")
    matching = [r["id"] for r in runs if r["display_title"] == title and r["head_sha"] == source_sha]
    require(matching and min(matching) == run_id and run["run_attempt"] == 1,
            "Duplicate execution; recover through the coordinator instead of rerunning jobs")
    pr = api.pr(pr_number) if pr_number else None
    if pr:
        require(state["pr_number"] == pr_number and pr["head"]["sha"] == inputs["expected_head_sha"] and
                state["branch"] == pr["head"]["ref"], "Canonical PR moved before worker startup")
        ancestry = api.request(f"/compare/{api.main()}...{pr['head']['sha']}")
        require(ancestry["status"] in ("ahead", "identical"),
                "Canonical PR does not include current main; update its branch before replanning")
    else:
        require(worker == "planner" and state["pr_number"] is None and inputs["expected_head_sha"] == api.main(),
                "Only initial planning can run without a PR")
    require(api.comments_hash(issue) == state["comments_sha256"], "Human decisions changed before worker startup")
    approval = None
    if worker != "planner":
        require(pr, "Implementation/review requires a canonical PR")
        handoff, _ = planner_packet(api, issue, pr)
        validate_approval(api, state, pr, handoff)
        validate_diff(api, state, pr, handoff)
        approval = state["approval"]
    branch = pr["head"]["ref"] if pr else f"agent-plan/issue-{issue}"
    require(re.fullmatch(r"agent-plan/issue-[1-9][0-9]*(?:-[a-zA-Z0-9_-]+)?", branch), "Unexpected branch name")
    return {"schema_version": "1.0.0", "worker": worker, "run_id": run_id, "issue_number": issue,
            "pr_number": pr_number, "branch": branch, "expected_head_sha": inputs["expected_head_sha"],
            "transition_id": inputs["transition_id"], "base_commit": api.main(),
            "state_revision": state["revision"], "approval": approval,
            "remediation": state.get("remediation", []) if state["attempt"] else [], "attempt": state["attempt"]}


def main():
    inputs = {name: os.environ[name.upper()] for name in
              ("issue_number", "pr_number", "expected_head_sha", "transition_id")}
    context = prepare(GitHub(), os.environ["AGENT_WORKER"], inputs,
                      int(os.environ["GITHUB_RUN_ID"]), os.environ["GITHUB_SHA"])
    directory = Path("/tmp/gh-aw")
    directory.mkdir(parents=True, exist_ok=True)
    # Only validated metadata is materialized here; issue/comment reads remain MCP-only.
    (directory / "agent-context.json").write_bytes(encode(context))
    if context["approval"]:
        (directory / "approval.json").write_bytes(encode(context["approval"]))
    # The script and modules have already loaded from trusted main. Disable git
    # hooks and never execute PR-provided setup scripts in this privileged step.
    subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "fetch", "--no-tags", "--depth=1",
                    "origin", context["expected_head_sha"]], check=True, timeout=60)
    subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "checkout", "-B", context["branch"],
                    context["expected_head_sha"]], check=True, timeout=30)


if __name__ == "__main__":
    try:
        main()
    except Blocked as error:
        print("Worker preparation blocked:", str(error)[:1000])
        raise SystemExit(1)
