"""Local, no-network schema/hash check for a planner's saved artifacts."""
import argparse
import json
from pathlib import Path

from agent_runtime import Blocked, digest, require, safe_path, validate


def check(root, issue):
    directory = root / f"specs/issue-{issue}"
    handoff = json.loads((directory / "planner-handoff.json").read_text())
    validate(handoff, "contract-v1.schema.json")
    require(handoff["issue"]["number"] == issue, "Issue mismatch")
    require(digest((directory / "issue-snapshot.json").read_bytes()) == handoff["issue"]["snapshot_sha256"],
            "Issue snapshot digest mismatch")
    for kind, path_key, hash_key in (("spec", "spec_file", "spec_sha256"), ("plan", "plan_file", "plan_sha256")):
        if handoff[kind]:
            path = safe_path(handoff[kind][path_key])
            require(path == f"specs/issue-{issue}/{kind}.md", "Unexpected artifact path")
            require(digest((root / path).read_bytes()) == handoff[kind][hash_key], f"{kind} digest mismatch")
    return handoff


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("issue", type=int)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    arguments = parser.parse_args()
    try:
        check(arguments.root, arguments.issue)
        print("Planner schema and saved byte hashes are valid; live freshness/approval remain separate checks.")
    except (Blocked, OSError, ValueError) as error:
        parser.exit(1, str(error) + "\n")
