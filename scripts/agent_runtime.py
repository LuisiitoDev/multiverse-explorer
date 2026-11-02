"""Shared, data-only GitHub API and handoff validation helpers.

The coordinator runs this code from the default branch. Never import code from
an agent artifact or a pull-request checkout into that privileged process.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

from jsonschema import Draft202012Validator, FormatChecker

STATE_BRANCH = "agent-orchestration-state"
WORKFLOWS = {"planner": "agent-plan.lock.yml", "implementer": "agent-implement.lock.yml",
             "reviewer": "agent-review.lock.yml"}
MAX_BYTES = 2 * 1024 * 1024
SHA = re.compile(r"^[0-9a-f]{40}$")
TRANSITION = re.compile(r"^[0-9a-f]{32}$")
CONTROL_COMMAND = re.compile(r"^/agent (?:plan|reconcile|recover|adopt [1-9][0-9]*|approve [0-9a-f]{40} [0-9a-f]{64})$")
ROOT = Path(__file__).resolve().parents[1]


class Blocked(Exception):
    """An observable gate failure; never turn it into successful agent work."""


def require(condition, message):
    if not condition:
        raise Blocked(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode(data):
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def validate(document, schema_name):
    schema = json.loads((ROOT / "docs/agent-handoffs" / schema_name).read_text())
    errors = sorted(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(document),
                    key=lambda error: str(list(error.path)))
    require(not errors, f"Invalid {schema_name}: " + "; ".join(error.message for error in errors[:5]))


def safe_path(path):
    require(isinstance(path, str) and path and "\\" not in path, "Invalid artifact path")
    parsed = PurePosixPath(path)
    require(not parsed.is_absolute() and ".." not in parsed.parts and str(parsed) == path,
            "Non-canonical artifact path")
    return path


def allowed_path(path, allowed, denied):
    """Only exact paths or terminal /** prefixes; fail closed on complex globs."""
    safe_path(path)
    def matches(pattern):
        safe_path(pattern)
        require(not any(char in pattern.removesuffix("/**") for char in "*?["),
                "Scope supports only exact paths and directory/** prefixes")
        return path.startswith(pattern[:-2]) if pattern.endswith("/**") else path == pattern
    return not any(matches(p) for p in denied) and any(matches(p) for p in allowed)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, *args):
        return None


class GitHub:
    def __init__(self, repo=None, token=None):
        self.repo = repo or os.environ["GITHUB_REPOSITORY"]
        require(re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repo), "Invalid repository")
        self.token = token if token is not None else os.environ["GH_TOKEN"]
        self.opener = urllib.request.build_opener(NoRedirect)

    def request(self, path, method="GET", data=None, missing=False, redirect=False):
        require(path.startswith("/") and not path.startswith("//"), "API path must be repository-relative")
        url = "https://api.github.com/repos/" + self.repo + path
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/vnd.github+json",
                   "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "multiverse-agent-orchestrator"}
        payload = None if data is None else json.dumps(data).encode()
        request = urllib.request.Request(url, data=payload, method=method, headers=headers)
        try:
            with self.opener.open(request, timeout=30) as response:
                raw = response.read(MAX_BYTES + 1)
                require(len(raw) <= MAX_BYTES, "API response exceeds size limit")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            if missing and error.code == 404:
                return None
            if redirect and error.code in (301, 302, 303, 307):
                return error.headers["Location"]
            raise Blocked(f"GitHub API {method} {path.split('?')[0]} returned HTTP {error.code}") from None

    def pages(self, path, key=None):
        result = []
        separator = "&" if "?" in path else "?"
        for page in range(1, 11):
            data = self.request(f"{path}{separator}per_page=100&page={page}")
            entries = data[key] if key else data
            result.extend(entries)
            if len(entries) < 100:
                return result
        raise Blocked("Pagination limit reached; refusing incomplete evidence")

    def file(self, path, ref, missing=False):
        safe_path(path)
        result = self.request("/contents/" + urllib.parse.quote(path, safe="/") + "?ref=" +
                              urllib.parse.quote(ref, safe=""), missing=missing)
        if result is None:
            return None
        require(result.get("type") == "file" and result.get("encoding") == "base64", "Expected a regular file")
        require(result.get("size", MAX_BYTES + 1) <= MAX_BYTES, "File exceeds size limit")
        return base64.b64decode(result["content"])

    def main(self):
        ref = self.request("/git/ref/heads/main")
        return ref["object"]["sha"]

    def state(self, issue):
        result = self.request(f"/contents/.agent-state/issue-{issue}.json?ref={STATE_BRANCH}", missing=True)
        if result is None:
            return None, None
        state = json.loads(base64.b64decode(result["content"]))
        validate(state, "orchestration-state.schema.json")
        require(state["issue_number"] == issue, "State issue identity mismatch")
        return state, result["sha"]

    def save(self, state, sha):
        validate(state, "orchestration-state.schema.json")
        if self.request(f"/git/ref/heads/{STATE_BRANCH}", missing=True) is None:
            self.request("/git/refs", "POST", {"ref": "refs/heads/" + STATE_BRANCH, "sha": self.main()})
        body = {"message": f"Record issue #{state['issue_number']} orchestration revision {state['revision']}",
                "branch": STATE_BRANCH, "content": base64.b64encode(encode(state)).decode()}
        if sha:
            body["sha"] = sha  # Contents API enforces a compare-and-swap lease.
        result = self.request(f"/contents/.agent-state/issue-{state['issue_number']}.json", "PUT", body)
        return result["content"]["sha"]

    def writer(self, user):
        require(user.get("type") == "User", "A human repository writer is required")
        permission = self.request("/collaborators/" + urllib.parse.quote(user["login"], safe="") + "/permission")
        require(permission["permission"] in ("admin", "maintain", "write"), "Repository write permission required")

    def pr(self, number):
        pr = self.request(f"/pulls/{number}")
        require(pr["state"] == "open" and pr["head"]["repo"]["full_name"].lower() == self.repo.lower(),
                "Canonical PR must be open and in this repository")
        require(pr["base"]["ref"] == "main" and pr["head"]["ref"].startswith("agent-plan/issue-"),
                "Canonical PR must use an agent planning branch targeting main")
        require(pr["title"].startswith("[Agent Lab] ") and
                "agent-plan" in {label["name"] for label in pr["labels"]}, "Canonical PR markers missing")
        return pr

    def comments_hash(self, issue):
        comments = self.pages(f"/issues/{issue}/comments")
        # Bot status messages do not invalidate a plan; human decisions do.
        return digest(encode([{k: c[k] for k in ("id", "updated_at", "body")} for c in comments
                              if c["user"]["type"] == "User" and not CONTROL_COMMAND.fullmatch(c["body"].strip())]))

    def json_artifact(self, run_id, artifact_name, filename):
        artifacts = self.pages(f"/actions/runs/{run_id}/artifacts", "artifacts")
        selected = [a for a in artifacts if a["name"] == artifact_name and not a["expired"]]
        require(len(selected) == 1, f"Expected one {artifact_name} artifact")
        require(selected[0]["size_in_bytes"] <= MAX_BYTES, "Artifact exceeds size limit")
        location = self.request(f"/actions/artifacts/{selected[0]['id']}/zip", redirect=True)
        parsed = urllib.parse.urlparse(location)
        host = parsed.hostname or ""
        require(parsed.scheme == "https" and (host.endswith(".blob.core.windows.net") or
                host.endswith(".actions.githubusercontent.com") or host.endswith(".githubusercontent.com")),
                "Unexpected artifact download destination")
        # Signed storage URLs are fetched WITHOUT the GitHub Authorization header.
        with urllib.request.urlopen(location, timeout=30) as response:
            raw = response.read(MAX_BYTES + 1)
        require(len(raw) <= MAX_BYTES, "Artifact download exceeds size limit")
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            require(len(entries) == 1 and entries[0].filename == filename and
                    entries[0].file_size <= MAX_BYTES and not entries[0].is_dir() and
                    (entries[0].external_attr >> 16) & 0o170000 != 0o120000,
                    "Unexpected artifact layout")
            return json.loads(archive.read(entries[0]))


def planner_packet(api, issue_number, pr, require_planned=True):
    head = pr["head"]["sha"]
    directory = f"specs/issue-{issue_number}"
    raw = api.file(directory + "/planner-handoff.json", head)
    handoff = json.loads(raw)
    validate(handoff, "contract-v1.schema.json")
    require(handoff["issue"]["number"] == issue_number, "Planner issue mismatch")
    issue = api.request(f"/issues/{issue_number}")
    require(issue["state"] == "open" and "pull_request" not in issue, "Originating issue is not open")
    snapshot = api.file(directory + "/issue-snapshot.json", head)
    require(digest(snapshot) == handoff["issue"]["snapshot_sha256"], "Issue snapshot hash mismatch")
    require(json.loads(snapshot) == {k: issue[k] for k in ("number", "title", "body")}, "Issue snapshot is stale")
    for field, path_key, hash_key in (("spec", "spec_file", "spec_sha256"), ("plan", "plan_file", "plan_sha256")):
        artifact = handoff[field]
        if artifact:
            require(artifact[path_key] == f"{directory}/{field}.md", "Unexpected planning artifact path")
            require(digest(api.file(artifact[path_key], head)) == artifact[hash_key], f"{field} hash mismatch")
    if require_planned:
        require(handoff["status"] == "PLANNED", "Planner is not PLANNED")
        require(handoff.get("execution_scope"), "Replan to produce machine-readable execution_scope")
        require(handoff["base_commit"] == api.main(), "Planning baseline differs from current main; replan")
        ancestry = api.request(f"/compare/{handoff['base_commit']}...{head}")
        require(ancestry["status"] in ("ahead", "identical"),
                "Current main is not in the PR history; update the PR branch before replanning")
    return handoff, digest(raw)


def validate_approval(api, state, pr, handoff):
    approval = state.get("approval")
    require(approval, "Human approval record missing")
    validate(approval, "approval.schema.json")
    require(approval["issue_number"] == state["issue_number"] and approval["pr_number"] == pr["number"],
            "Approval identity mismatch")
    require(approval["spec_sha256"] == handoff["spec"]["spec_sha256"] and
            approval["plan_sha256"] == handoff["plan"]["plan_sha256"] and
            approval["base_commit"] == handoff["base_commit"], "Approval hashes are stale")
    if "comment_id" in approval:
        comment = api.request(f"/issues/comments/{approval['comment_id']}")
        api.writer(comment["user"])
        require(comment["user"]["login"] == approval["actor"] and comment["body"] == approval["statement"] and
                comment["issue_url"] == f"https://api.github.com/repos/{api.repo}/issues/{state['issue_number']}" and
                comment["body"].strip() == f"/agent approve {approval['approved_head_sha']} {approval['plan_sha256']}",
                "Human approval comment changed or belongs to a different issue")
    else:
        review = api.request(f"/pulls/{pr['number']}/reviews/{approval['review_id']}")
        api.writer(review["user"])
        require(review["state"] == "APPROVED" and review["commit_id"] == approval["approved_head_sha"] and
                review["user"]["login"] == approval["actor"], "Human review was dismissed or changed")
    # Implementation commits may follow the approved planning revision, but the
    # exact approved spec/plan bytes and baseline must remain unchanged.
    approved_pr = {**pr, "head": {**pr["head"], "sha": approval["approved_head_sha"]}}
    previous, _ = planner_packet(api, state["issue_number"], approved_pr)
    require(previous == handoff, "Planner handoff changed after approval")


def validate_diff(api, state, pr, handoff):
    comparison = api.request(f"/compare/{state['approval']['approved_head_sha']}...{pr['head']['sha']}")
    require(comparison["status"] in ("ahead", "identical"), "Implementation is not descended from approved plan")
    files = comparison.get("files", [])
    require(len(files) < 300, "Compare file limit reached; cannot verify full scope")
    scope = handoff["execution_scope"]
    for file in files:
        for path in {file["filename"], file.get("previous_filename", file["filename"])}:
            metadata = path in {f"specs/issue-{state['issue_number']}/implementation-handoff.json",
                                f"specs/issue-{state['issue_number']}/tasks.md"}
            require(metadata or allowed_path(path, scope["allowed_paths"], scope["denied_paths"]),
                    f"Implementation changed an unapproved path: {path}")
    return [file["filename"] for file in files]
