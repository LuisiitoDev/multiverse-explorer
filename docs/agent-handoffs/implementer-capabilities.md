# Implementer capability contract

What the Implementer sandbox can actually do. The Planner must plan agent work
only inside this contract; anything else is a **human follow-up** listed in
`plan.md` under `## Human follow-ups` and done by a human on the same PR branch
after implementation and review, before merge. Keep this file in sync with
`.github/workflows/agent-implement.md` when either changes.

## Shell commands (unattended, no approval prompts)

| Purpose | Allowed command stems |
|---|---|
| Git (local only) | `git status`, `git diff`, `git rev-parse`, `git add`, `git commit` |
| Files / time | `mkdir`, `date -u`, `sha256sum` |
| Node / npm | `npm ci`, `npm install`, `npm run`, `npm test`, `npm view`, `node --version`, `node -v`, `npm --version`, `npm -v` |
| .NET | `dotnet restore`, `dotnet build`, `dotnet test` (explicit `.csproj`) |
| Bicep | `bicep` (permission covers the executable; use only `bicep build <file> --stdout`, `bicep lint <file>`, `bicep --version`; standalone CLI provided by a trusted step, used instead of `az bicep build`) |

Not available: `curl`/`wget`, `az` (no Azure credentials, no deployments or
`az deployment ... validate`), `docker`, `gh`, arbitrary `node -e`/scripts,
global installs.

## Network

npm and NuGet registries plus GitHub's default infrastructure. Any other host
(for example NASA image servers or CDNs) is blocked, so external binary assets
are human follow-ups unless they ship inside an npm/NuGet package already named
in the plan.

## Publication

The agent publishes only through the `push-to-pull-request-branch` safe output
with the paths in `publication-scope.json`. Never `.github/workflows/**`: the
token lacks the `workflows` scope and workflow changes are human-only.
A single publication is limited to 100 files and 4 MB.

## Time

The agent step has 45 minutes. Plans larger than that must be split into
separate issues.
