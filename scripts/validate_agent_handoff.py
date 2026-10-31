#!/usr/bin/env python3
"""Validate the v1 agent state packet with only the Python standard library."""
from __future__ import annotations
import argparse, hashlib, json, re, sys
from pathlib import Path

HEX40=re.compile(r"^[0-9a-f]{40}$"); HEX64=re.compile(r"^[0-9a-f]{64}$")
ORDER={"PLANNED":0,"APPROVED":1,"IMPLEMENTED":2,"REVIEWED":3}
FILES=["planner-handoff.json","approval.json","implementation-handoff.json","review-handoff.json"]

def fail(errors,msg): errors.append(msg)
def load(path,errors):
    try: return json.loads(path.read_text())
    except Exception as exc: fail(errors,f"{path}: invalid JSON: {exc}"); return None
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_doc(doc,path,errors):
    required={"contract_version","handoff_id","issue","source","target","status","context","scope","evidence","next_action"}
    missing=required-set(doc)
    if missing: fail(errors,f"{path}: missing {sorted(missing)}"); return
    if doc["contract_version"]!="1.0": fail(errors,f"{path}: unsupported contract_version")
    issue=doc.get("issue",{})
    if not isinstance(issue.get("number"),int) or not HEX64.fullmatch(issue.get("snapshot_sha256","")): fail(errors,f"{path}: invalid issue identity")
    scope=doc.get("scope",{})
    if not HEX40.fullmatch(scope.get("base_sha","")): fail(errors,f"{path}: invalid base_sha")
    if not scope.get("allowed_paths"): fail(errors,f"{path}: allowed_paths must be non-empty")
    if set(scope.get("allowed_paths",[])) & set(scope.get("denied_paths",[])): fail(errors,f"{path}: a path is both allowed and denied")
    context=doc.get("context",{})
    if set(context)!={"requirements","repository","rules","results"}: fail(errors,f"{path}: context must contain exactly the 4R keys")
    if doc.get("attempt",0)>1: fail(errors,f"{path}: remediation retry limit exceeded")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("packet",type=Path); args=ap.parse_args()
    root=args.packet; errors=[]; docs=[]
    for name in FILES:
        path=root/name
        if path.exists():
            doc=load(path,errors)
            if doc: validate_doc(doc,path,errors); docs.append((name,doc))
    if not docs: fail(errors,f"{root}: no handoff documents found")
    statuses=[d["status"] for _,d in docs]
    known=[ORDER[s] for s in statuses if s in ORDER]
    if known!=sorted(known): fail(errors,f"{root}: state regression: {statuses}")
    issue_numbers={d["issue"]["number"] for _,d in docs}
    issue_hashes={d["issue"]["snapshot_sha256"] for _,d in docs}
    base_shas={d["scope"]["base_sha"] for _,d in docs}
    if len(issue_numbers)>1 or len(issue_hashes)>1: fail(errors,f"{root}: issue identity changed across handoffs")
    if len(base_shas)>1: fail(errors,f"{root}: stale state: base SHA changed across handoffs")
    plan=root/"plan.md"
    for name,doc in docs:
        if doc["status"] in {"APPROVED","IMPLEMENTED","REVIEWED"}:
            approval=doc.get("approval")
            if not approval: fail(errors,f"{name}: explicit approval record required"); continue
            if approval.get("statement")!="I approve this exact plan and scope for implementation.": fail(errors,f"{name}: approval statement is not exact")
            if plan.exists() and approval.get("plan_sha256")!=digest(plan): fail(errors,f"{name}: stale plan hash")
            if approval.get("base_sha")!=doc["scope"]["base_sha"]: fail(errors,f"{name}: approval/base SHA mismatch")
        if doc["status"]=="PLANNED" and doc.get("approval"): fail(errors,f"{name}: planner cannot self-approve")
    if errors:
        print("\n".join(f"ERROR: {e}" for e in errors)); return 1
    print(f"OK: {root} satisfies handoff contract v1 ({', '.join(statuses)})"); return 0
if __name__=="__main__": sys.exit(main())
