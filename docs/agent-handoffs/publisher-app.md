# Publisher GitHub App

Run 41523504642 failed because the planned patch edits deployment workflows and
the publisher's GITHUB_TOKEN cannot grant the required Workflows permission.
Adding a path to allowed-files does not authorize a workflow-file write.

The Implementer declares `push-to-pull-request-branch.allow-workflows: true`
and a publisher-only GitHub App, limited to LuisiitoDev/multiverse-explorer.
The agent and GitHub MCP retain read-only tokens. Workflow-file publication is
narrowed from `.github/workflows/**` to exactly cd.yml, infra.yml,
bluegreen-swap.yml and set-feature-flag.yml under that directory. Agent/CI/control
workflows remain outside the allowed paths. Human plan approval, approved scope,
protected-file review and human merge remain required.

## One-time setup in GitHub

1. [Register a GitHub App](https://github.com/settings/apps/new) owned by
   LuisiitoDev. Use the repository URL as its homepage. A webhook/server is not
   needed for installation-token authentication; disable the unused webhook.
2. Grant the repository permissions requested by the publisher:

   | Permission | Access |
   |---|---|
   | Administration | Read (inspect branch protections) |
   | Contents | Read and write |
   | Issues | Read and write |
   | Pull requests | Read and write |
   | Workflows | Read and write |
   | Metadata | Read (implicit) |

   Do not grant organization/account permissions. Accept the installation's
   permission update if GitHub requests confirmation after changing them.
3. Install it on **Only select repositories → multiverse-explorer**.
4. Save its public **Client ID** as repository Actions **Variable**
   `GH_AW_APP_CLIENT_ID`.
5. Generate an App private key and save the complete PEM as repository Actions
   **Secret** `GH_AW_APP_PRIVATE_KEY`. Keep it in GitHub's secret store; never
   add it to git, a workflow input, issue or chat.

These names are configuration references, not proof that credentials exist.
The connector used for the patch cannot inspect Actions variables/secrets or
create/install the App. No App, key, installation or setting was provisioned.

## Fail early, then publish after approval

`route` checks presence only; its script receives a boolean for the key, never
the key. `publisher-auth` requests a short-lived repository-scoped token with
the required permissions **before the Planner**. Invalid keys, absent
installations and insufficient permissions fail there. No API write uses this
preflight token, no token is exported across jobs, and the pinned official
action revokes it when the job ends. No token is held while a human reviews.

After native plan approval, the controlled safe-output and conclusion/report
jobs mint fresh installation tokens for publication/reporting. Its private key/token are never passed to model/MCP jobs.
There is no unprivileged-token fallback for workflow-file writes. Merging source
alone does not activate or configure an App; the owner must complete setup.

After setup and merging the reviewed source/lock, start a **new** Agent pipeline
run. Old runs retain their old code. This addresses workflow publication
authorization; previously observed PARTIAL work (texture/validation) still needs
completion and remains gated.

The compiler reports the new restricted secret reference as an unapproved safe
update. That warning is retained for owner review; it is not suppressed and no
`--approve` override is used. Source/lock review and a draft PR do not provision
credentials, authorize a hosted run or establish that the App is ready.
