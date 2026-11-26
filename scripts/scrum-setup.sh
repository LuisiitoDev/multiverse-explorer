#!/usr/bin/env bash
# Idempotent Scrum setup for this repository: labels, milestones and a GitHub Project (v2).
# Usage: scripts/scrum-setup.sh [owner/repo]        Needs: gh, jq, and `gh auth login` with scopes repo + project.
# Safe to re-run: existing labels, milestones, project and fields are skipped.
# Views, Status options and Project workflows have no API: finish them by hand (docs/scrum.md, section 6).
set -euo pipefail

REPO="${1:-LuisiitoDev/multiverse-explorer}"
OWNER="${REPO%%/*}"
PROJECT_TITLE="${PROJECT_TITLE:-Multiverse Explorer: Scrum}"
SPRINT_START="${SPRINT_START:-$(date -d 'next monday' +%F)}" # first sprint starts this Monday

command -v gh >/dev/null && command -v jq >/dev/null || { echo "gh and jq are required" >&2; exit 1; }

# --- Labels (name|color|description). Forge's own labels (forge, planning, blocked...) are not touched. ---
labels=(
  "type: story|0E8A16|User story: value for a user, fits in one sprint"
  "type: bug|D73A4A|Defect in delivered behaviour"
  "type: chore|C5DEF5|Maintenance with no user-visible change"
  "type: spike|FBCA04|Time-boxed research; output is knowledge, not code"
  "epic|5319E7|Large item to split into stories before a sprint"
  "tech-debt|BFD4F2|Debt the team chose to take or must repay"
  "impediment|B60205|Blocks the team; raised in the Daily Scrum"
)
for l in "${labels[@]}"; do
  IFS='|' read -r name color desc <<<"$l"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force >/dev/null
  echo "label: $name"
done

# --- Milestones = release goals (Product Backlog grouped by outcome). Sprints are the Project's Iteration field. ---
# Edit titles and descriptions to the real roadmap. No due date: set it when the release is forecast.
milestones=(
  "v0.1 Foundation|Delivery baseline: CI/CD, environments, working app skeleton."
  "v0.2 Core|Core product capabilities for first real users."
  "v1.0 GA|General availability: hardening, docs, operability."
)
existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')"
for m in "${milestones[@]}"; do
  title="${m%%|*}"; desc="${m#*|}"
  if grep -qxF "$title" <<<"$existing"; then echo "milestone exists: $title"; continue; fi
  gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
  echo "milestone: $title"
done

# --- Project ---
num="$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number" | head -1)"
if [ -z "$num" ]; then
  num="$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq '.number')"
  echo "project created: #$num"
else
  echo "project exists: #$num"
fi
gh project link "$num" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || true

fields="$(gh project field-list "$num" --owner "$OWNER" --format json)"
has() { jq -e --arg n "$1" '.fields[] | select(.name==$n)' <<<"$fields" >/dev/null; }

has "Estimate" || gh project field-create "$num" --owner "$OWNER" --name "Estimate" \
  --data-type SINGLE_SELECT --single-select-options "1,2,3,5,8,13" >/dev/null
has "Priority" || gh project field-create "$num" --owner "$OWNER" --name "Priority" \
  --data-type SINGLE_SELECT --single-select-options "P0 Critical,P1 High,P2 Medium,P3 Low" >/dev/null

# The Sprint field is an Iteration (2 weeks). The CLI cannot create one, so use GraphQL.
# To verify: createProjectV2Field with iterationConfiguration, run against the real API.
if ! has "Sprint"; then
  pid="$(gh project view "$num" --owner "$OWNER" --format json --jq '.id')"
  gh api graphql -f query='
    mutation($pid: ID!, $start: Date!) {
      createProjectV2Field(input: {
        projectId: $pid, dataType: ITERATION, name: "Sprint",
        iterationConfiguration: { startDate: $start, duration: 14, iterations: [
          {title: "Sprint 1", startDate: $start, duration: 14}
        ]}
      }) { projectV2Field { ... on ProjectV2IterationField { id } } }
    }' -f pid="$pid" -f start="$SPRINT_START" >/dev/null
fi

echo
echo "Done. Project: https://github.com/users/$OWNER/projects/$num"
echo "Now finish by hand: Status options, views, workflows (docs/scrum.md, section 6)."
