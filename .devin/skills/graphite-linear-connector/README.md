# Graphite-Linear Connector Skill

Connects Graphite PR stacks to Linear issues using semantic matching.

## Usage

Invoke the skill when you want to:

- Connect a Graphite PR to an existing Linear issue
- Create a new Linear issue from a Graphite PR
- Link multiple PRs to Linear issues

## Trigger Phrases

- "connect to linear"
- "create linear issue"
- "link pr to linear"

## PR Selection Options

Specify which PRs to process:

- **current** - Current PR/branch (default)
- **last five** - 5 most recent PRs in stack
- **today** - PRs created today
- **last** - Last PR in stack

## Examples

```
"Connect to linear"
"Connect the last five PRs to linear"
"Create linear issues for today's PRs"
"Link current PR to linear"
```

## How It Works

1. Fetches PR data from Graphite (title, branch name, commit messages)
2. Searches Linear issues in backlog, in progress, and todo states
3. Performs semantic matching between PR content and Linear issues
4. Applies threshold logic (confidence → action):
   - **95–100%**: strong auto-match suggestion
   - **80–94%**: asks you to confirm the match
   - **50–79%**: shows ambiguous candidates for you to choose
   - **<50%**: new-issue flow (standalone always confirms before creating)
5. Links matching issue to PR or creates new Linear issue

## New Issue Creation

When creating a new Linear issue:

- You'll be asked which team to create it in
- Title is generated from PR content
- Description uses the exact template structure from `.devin/linear-issue-template.md` (Goal, Context, Requirements, Impact, Constraints)
- Priority is auto-set based on commit type:
  - `fix` → Urgent (priority 1)
  - `feat` → High (priority 2)
  - `refactor` → Medium (priority 3)
  - `chore` → Low (priority 4)
- Status set to "In Progress"
- Assigned to Juhani Juusola
- Issue ID added as resource to Graphite PR

## Requirements

- Graphite CLI installed and authenticated
- Linear MCP server configured
- Linear workspace accessible

## Notes

- Checks all Linear issues (not just assigned to you)
- Always confirms before making changes
- Shows matching candidates with similarity scores
- Allows you to override automated decisions
