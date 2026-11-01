#!/usr/bin/env bash
set -euo pipefail

# SCMS Pull Request Automation Bash Script
# Invoked directly or via the /scms-pr skill on Linux/macOS

REPO_OWNER="Smart-Complaint-Management"
REPO_NAME="Smart-Complaint-Management-System-SE-Project"
REPO_FULL="${REPO_OWNER}/${REPO_NAME}"
BASE_BRANCH="main"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../" && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"

echo -e "\033[36m=== SCMS Pull Request Automation (/scms-pr) ===\033[0m\n"

# 1. Identify current branch
cd "${REPO_ROOT}"
CURRENT_BRANCH="$(git branch --show-current | tr -d '\r\n')"
echo "Current branch: ${CURRENT_BRANCH}"

# 2. Reject if on main
if [ "${CURRENT_BRANCH}" = "${BASE_BRANCH}" ]; then
  echo -e "\n\033[31m[ERROR] Cannot create a pull request from default branch '${BASE_BRANCH}'.\033[0m"
  echo "Please switch to a feature branch first (e.g., git checkout -b feature/<name>)."
  exit 1
fi

# 3. Check for uncommitted changes
STATUS_OUTPUT="$(git status --porcelain)"
if [ -n "${STATUS_OUTPUT}" ]; then
  echo -e "\n\033[31m[ERROR] Working tree has uncommitted changes:\033[0m"
  echo "${STATUS_OUTPUT}"
  echo -e "\nPlease commit or stash changes before creating a pull request."
  exit 1
fi
echo -e "\033[32m✓ Working tree is clean.\033[0m"

# 4. Fetch latest origin/main
echo -e "\nFetching latest origin/${BASE_BRANCH}..."
git fetch origin "${BASE_BRANCH}" 2>/dev/null || true

COUNTS="$(git rev-list --left-right --count origin/${BASE_BRANCH}...HEAD)"
BEHIND="$(echo "${COUNTS}" | awk '{print $1}')"
AHEAD="$(echo "${COUNTS}" | awk '{print $2}')"

echo "Branch status relative to origin/${BASE_BRANCH}: ${AHEAD} commit(s) ahead, ${BEHIND} commit(s) behind."

if [ "${BEHIND}" -gt 0 ]; then
  echo -e "\n\033[33m[WARNING] Your branch is ${BEHIND} commit(s) behind origin/${BASE_BRANCH}.\033[0m"
  echo "It is recommended to merge origin/${BASE_BRANCH} before opening a PR."
fi

if [ "${AHEAD}" -eq 0 ]; then
  echo -e "\n\033[31m[ERROR] Branch '${CURRENT_BRANCH}' has 0 commits ahead of origin/${BASE_BRANCH}. Nothing to pull request.\033[0m"
  exit 1
fi

# 5. Check if open PR already exists
echo -e "\nChecking for existing pull requests..."
EXISTING_URL="$(gh pr list --repo "${REPO_FULL}" --head "${CURRENT_BRANCH}" --base "${BASE_BRANCH}" --state open --json url --jq '.[0].url' 2>/dev/null || true)"

if [ -n "${EXISTING_URL}" ] && [[ "${EXISTING_URL}" =~ ^https:// ]]; then
  echo -e "\n\033[33m[INFO] An open pull request already exists for branch '${CURRENT_BRANCH}': ${EXISTING_URL}\033[0m"
  echo "Skipping PR creation to prevent duplicates."
  exit 0
fi
echo -e "\033[32m✓ No duplicate open PR found.\033[0m"

# 6. Run frontend quality gates
echo -e "\n\033[36m=== Running Frontend Quality Gates ===\033[0m\n"
cd "${FRONTEND_DIR}"

run_gate() {
  local name="$1"
  local cmd="$2"
  echo -e "--> Running ${name} (${cmd})..."
  local start_time=$(date +%s)
  if eval "${cmd}"; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo -e "\033[32m✓ ${name} PASSED (${duration}s)\033[0m\n"
  else
    echo -e "\n\033[31m[ERROR] ${name} failed.\033[0m\n"
    exit 1
  fi
}

run_gate "TypeScript Typecheck" "npm run typecheck"
run_gate "ESLint Code Quality" "npm run lint"
run_gate "Vitest Unit & Integration Tests" "npm test"
run_gate "Production Bundle Build" "npm run build"

cd "${REPO_ROOT}"

# 7. Formulate PR title and description
echo "Generating PR title and description from commits..."
TOP_COMMIT_SUBJECT="$(git log -1 --format="%s")"
COMMIT_SUMMARY="$(git log "origin/${BASE_BRANCH}..HEAD" --format="- %h: %s")"

PR_TITLE="${TOP_COMMIT_SUBJECT}"

PR_BODY=$(cat <<EOF
## Pull Request Overview

This pull request was prepared and verified for branch \`${CURRENT_BRANCH}\` targeting \`${BASE_BRANCH}\`.

### Included Commits (${AHEAD})
${COMMIT_SUMMARY}

### Pre-PR Quality Verification
| Quality Gate | Result | Status |
|---|---|---|
| TypeScript Typecheck (\`npm run typecheck\`) | Passed | Verified |
| ESLint (\`npm run lint\`) | Passed | Verified |
| Vitest Tests (\`npm test\`) | Passed | Verified |
| Production Build (\`npm run build\`) | Passed | Verified |

### Merge Safeguards
- Direct push to \`${BASE_BRANCH}\` is prohibited.
- All required GitHub Actions CI status checks must pass prior to merge.
- Required peer/team reviews must be approved before merge.
EOF
)

echo -e "PR Title: \033[33m${PR_TITLE}\033[0m"

# 8. Create PR targeting main
if command -v gh &>/dev/null; then
  echo -e "\nCreating PR using GitHub CLI (gh)..."
  if PR_CREATED_URL=$(gh pr create --base "${BASE_BRANCH}" --head "${CURRENT_BRANCH}" --title "${PR_TITLE}" --body "${PR_BODY}"); then
    echo -e "\033[32m✓ Pull request created: ${PR_CREATED_URL}\033[0m"
    if gh pr merge "${PR_CREATED_URL}" --auto --squash 2>/dev/null; then
      echo -e "\033[32m✓ Auto-merge enabled (will merge automatically once required checks and approvals pass).\033[0m"
    else
      echo "Notice: Auto-merge requires repository approval; PR remains open for review."
    fi
  fi
else
  echo -e "\n\033[36m[INFO] GitHub CLI (gh) is not installed locally.\033[0m"
  echo "Pushing branch to origin so GitHub Actions (.github/workflows/auto-pr.yml) can process the PR:"
  git push origin "${CURRENT_BRANCH}" || true
  WEB_COMPARE_URL="https://github.com/${REPO_FULL}/compare/${BASE_BRANCH}...${CURRENT_BRANCH}?expand=1"
  echo -e "\n\033[36mDirect PR creation link:\033[0m"
  echo "  ${WEB_COMPARE_URL}"
fi

echo -e "\n\033[36m=== Quality Gate Verification Summary ===\033[0m"
echo -e "\033[32m✓ TypeScript Typecheck: PASSED\033[0m"
echo -e "\033[32m✓ ESLint Code Quality: PASSED\033[0m"
echo -e "\033[32m✓ Vitest Tests: PASSED\033[0m"
echo -e "\033[32m✓ Production Build: PASSED\033[0m\n"
