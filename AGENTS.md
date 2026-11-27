# AGENTS.md

Rules for AI agents (Claude Code, GitHub Copilot, Codex, the Forge agents) and for people working in this repository.
How the team runs its sprints is in [docs/scrum.md](docs/scrum.md).

## Pull requests are small. This is an obligation.

A small pull request is reviewed carefully, merged quickly, and reverted cleanly. A large one gets skimmed. Every
pull request, from a person or an agent, follows these rules.

1. **One concern per pull request.** It does one thing a reviewer can describe in one sentence. If the title needs
   "and", it is two pull requests.
2. **Size limit: aim for 300 changed lines, never more than 500.** Count added plus deleted lines of code, tests, docs
   and configuration. Do **not** count lockfiles (`uv.lock`, `package-lock.json`), generated files (the EF schema script
   `schema.sql`) and files that are only moved or renamed. Above 500, split it **before** opening it.
   An exception is allowed only for something that cannot be divided, such as a mechanical rename or a generated file;
   say so at the top of the description.
3. **Tests travel with the code they test**, in the same pull request. Do not open "tests later". Documentation for a
   behaviour change is in the same pull request too.
4. **Split along seams**, for example: a model or port, then its implementation, then the endpoint that uses it.
   Keep apart: a refactor from a behaviour change, a dependency change from the code that uses it, and a
   workflow or CI change from product code (workflows need the owner's review).
5. **A story can take several pull requests.** Use `Part of #N` in all but the last, and `Closes #N` only in the last.
   If a story cannot be done in a few small pull requests, it is too big: split the issue (see the Definition of Ready
   in [docs/scrum.md](docs/scrum.md)).
6. **Stack as little as possible.** Prefer independent branches off `main`. If one pull request needs another, stack at
   most **two** deep, merge the bottom one first, and retarget the next one to `main`. The workflows here run on pull
   requests that target `main`; a stacked pull request has no checks until it is retargeted, so run the workflow by hand
   on its branch (`workflow_dispatch`) and say so in the description.
7. **Open as draft** until the checks pass. Agents never merge on their own: only when the repository owner explicitly orders it for that PR, and only once the required checks pass.

### Measure it before you open it

```bash
# Changed lines, without lockfiles and generated files
git diff --numstat origin/main...HEAD -- . ':(exclude)*uv.lock' ':(exclude)*package-lock.json' ':(exclude)*schema.sql' \
  | awk '{ added += $1; deleted += $2 } END { print added + deleted }'
```

For a pull request that is already open:

```bash
gh pr view <number> --json files \
  --jq '[.files[] | select(.path | test("package-lock\\.json$|uv\\.lock$|schema\\.sql$") | not) | .additions + .deletions] | add'
```

State the number in the description, in the "Notes for reviewers" section.
