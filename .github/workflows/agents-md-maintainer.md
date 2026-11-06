---
emoji: 📘
description: Weekly review of merged pull requests and changed source files that opens a pull request keeping AGENTS.md accurate and current.
intent: Keep AGENTS.md an accurate, concise guide for coding agents by reflecting repository changes since the previous run.
on:
  schedule: weekly
  workflow_dispatch:
  skip-if-match: 'is:pr is:open in:title "[agents-md]"'
permissions:
  contents: read
  pull-requests: read
  issues: read
tools:
  github:
    mode: gh-proxy
    toolsets: [default]
safe-outputs:
  create-pull-request:
    title-prefix: "[agents-md] "
    labels: [documentation, automation]
    draft: false
    allowed-files:
      - AGENTS.md
---

# AGENTS.md Maintainer

Keep `AGENTS.md` at the repository root accurate and current for coding agents working in this repo.

## Determine the review window

1. Find the previous run: the most recent merged pull request whose title starts with `[agents-md]` (use `gh pr list --state merged --search '"[agents-md]" in:title' --limit 1 --json mergedAt,mergeCommit`). Its `mergedAt` is the window start.
2. If none exists, use the last 7 days.
3. State the exact window (start and end timestamps) in the pull request body.

## Gather evidence

- List pull requests merged to the default branch within the window (`gh pr list --state merged --search "merged:>=<start>"`), reading titles, descriptions and changed file lists.
- Use `git log --since=<start> --name-status` on the checked-out repository to find source files that were added, removed, renamed or modified (backend, frontend, infra, dotnet, docker-compose, CI workflows, build/test config).
- Read the current `AGENTS.md` (it may not exist yet) and verify every claim in it against the repository as it is now: paths, commands, scripts, project names, ports, environment variables, conventions, and architecture notes.

## Update AGENTS.md

- Only change `AGENTS.md`. Never touch other files.
- If it does not exist, create it with: project overview, repository layout, how to build/run/test each part (backend, frontend, docker-compose, infra), coding conventions, CI/CD overview, and pitfalls. Base every statement on files you actually read.
- Otherwise make minimal edits: fix stale or wrong statements, document new commands/modules/conventions introduced by merged PRs, remove references to deleted things. Preserve the existing structure and tone.
- Keep it concise and factual. Do not copy PR descriptions, list individual PRs, or include speculation. Do not add content that merely restates the README.
- Never include secrets, tokens or credentials.

## Output

- If `AGENTS.md` needs changes, call `create-pull-request` with a title summarizing the update, and a body containing the review window, the merged PRs and changed areas that drove each edit, and anything you could not verify.
- If `AGENTS.md` is already accurate (or no relevant changes occurred in the window), call `noop` with a short reason. Do not open a PR with cosmetic-only changes.
