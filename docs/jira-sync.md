# Jira sync

GitHub is the source of truth. Jira (site `luisiitodev.atlassian.net`, project `ME`) is a **read-only mirror**, one
direction: GitHub to Jira. Edit work in GitHub; a re-sync overwrites the Jira copy.

Why one direction: Forge reacts to labels and comments on GitHub issues. A two-way sync would let Jira edits fight with
the agents and could loop.

## What exists (2026-11-26)

- The Jira app **GitHub for Atlassian** is installed and connected to the `LuisiitoDev` account, with access to one
  repository (which one was not verified). Put a Jira key, such as `ME-2`, in a branch name, commit message or pull
  request title and the pull request shows up on that Jira issue.
- GitHub issue #126 is mirrored as **ME-2**. Nothing runs by itself: the mirror was made on demand, with the Atlassian
  connector of a Claude Code session.

## Mapping

| GitHub | Jira |
|---|---|
| Issue number | Label `gh-<number>`. This is the key used to find the Jira issue again, so a re-sync never duplicates |
| Title | Summary, as `[GH#<number>] <title>` without the `[Feature]: ` prefix |
| Body | Description, after a line that links back to the GitHub issue |
| Label `type: bug` | Type `Error` (Bug). Anything else is `Historia` (Story) |
| Priority `P0` to `P3` (in the body or the Project) | Priority `Highest`, `High`, `Medium`, `Low`. Only `P2` to `Medium` has been run |
| Closed | Status `Listo` (Done). Not run yet |
| Open | Status `Por hacer` (To Do) |
| Forge labels (`planning`, `forge`, ...) | Not copied. They are the engine's state, not Jira's |

Only **open** issues were mirrored. The 8 closed issues (#26 to #35, the AZ-400 phases and an example) are history and
would only add noise to a new project.

## Re-run it

Ask Claude Code, in a session with the Atlassian connector: "sync the open issues of multiverse-explorer to Jira
project ME". For each open issue it searches `project = ME AND labels = "gh-<n>"`, creates the issue if missing, and
updates the summary and description if it exists. Closed issues that have a mirror are moved to `Listo`. Only the
create path has been run (ME-2). The update and close paths are untested.

## Limits

- **Not automatic.** It runs when someone asks.
- **Project fields are not synced** (`Status`, `Sprint`, `Estimate`, `Priority`). The Project belongs to a user
  account, and GitHub does not trigger Actions when its fields change, so they can only be read by polling.
- Jira's default workflow has three statuses; the Project has five. `Ready` and `In review` have no Jira equivalent
  unless they are added to the Jira board.
- The Atlassian connector in Claude Code uses a V1 endpoint that Atlassian removes on 2027-03-01. Reconnect it with
  `https://mcp.atlassian.com/v2/mcp` before then.

## To make it automatic

This needs a credential, so a person has to create it. Claude Code does not create or store tokens.

1. Create a Jira API token (https://id.atlassian.com/manage-profile/security/api-tokens).
2. Store `JIRA_BASE_URL`, `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` as repository secrets (`gh secret set`).
3. Add a workflow on `issues: [opened, edited, labeled, closed, reopened]` that does the same upsert through the Jira
   REST API, keyed on the `gh-<number>` label.

The alternative that needs no token is a scheduled Claude Code task that repeats the on-demand sync. It only runs while
the computer is on.
