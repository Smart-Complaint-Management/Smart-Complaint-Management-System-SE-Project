#!/usr/bin/env node

/**
 * SCMS Pull Request Automation Helper Script
 * Invoked directly or via the /scms-pr skill.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_OWNER = 'Smart-Complaint-Management';
const REPO_NAME = 'Smart-Complaint-Management-System-SE-Project';
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;
const BASE_BRANCH = 'main';

// Resolve project root
const repoRoot = path.resolve(__dirname, '../../../');
const frontendDir = path.join(repoRoot, 'frontend');

function runCmd(cmd, options = {}) {
  try {
    const res = execSync(cmd, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: options.pipe ? 'pipe' : 'inherit',
      shell: true,
      ...options,
    });
    return res ? res.trim() : '';
  } catch (error) {
    if (options.pipe && error.stdout) {
      return error.stdout.toString().trim();
    }
    throw error;
  }
}

async function checkExistingPR(branch) {
  // 1. Try gh CLI first if available
  try {
    const ghCheck = execSync(
      `gh pr list --head "${branch}" --base ${BASE_BRANCH} --state open --json number,url,title`,
      { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe', shell: true }
    ).trim();
    const parsed = JSON.parse(ghCheck);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    // Fall back to GitHub public REST API
  }

  // 2. Query GitHub public REST API
  try {
    const url = `https://api.github.com/repos/${REPO_FULL}/pulls?head=${REPO_OWNER}:${encodeURIComponent(branch)}&base=${BASE_BRANCH}&state=open`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SCMS-PR-Automation',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const pulls = await res.json();
      if (Array.isArray(pulls) && pulls.length > 0) {
        return {
          number: pulls[0].number,
          url: pulls[0].html_url,
          title: pulls[0].title,
        };
      }
    }
  } catch (err) {
    console.warn('Notice: Could not query GitHub API for existing PRs:', err.message);
  }

  return null;
}

async function main() {
  console.log('=== SCMS Pull Request Automation (/scms-pr) ===\n');

  // 1. Identify current branch
  const currentBranch = runCmd('git branch --show-current', { pipe: true });
  console.log(`Current branch: ${currentBranch}`);

  // 2. Reject if on main
  if (currentBranch === BASE_BRANCH) {
    console.error(`\n[ERROR] Cannot create a pull request from default branch '${BASE_BRANCH}'.`);
    console.error(`Please switch to a feature branch first (e.g., git checkout -b feature/<task-name>).`);
    process.exit(1);
  }

  // 3. Check for uncommitted changes
  const statusOutput = runCmd('git status --porcelain', { pipe: true });
  if (statusOutput.length > 0) {
    console.error(`\n[ERROR] Working tree has uncommitted changes:`);
    console.error(statusOutput);
    console.error(`\nPlease commit or stash changes before creating a pull request.`);
    process.exit(1);
  }
  console.log('✓ Working tree is clean.');

  // 4. Fetch latest origin/main
  console.log(`\nFetching latest origin/${BASE_BRANCH}...`);
  try {
    runCmd(`git fetch origin ${BASE_BRANCH}`);
  } catch (err) {
    console.warn(`Warning: git fetch origin ${BASE_BRANCH} failed:`, err.message);
  }

  // Check ahead/behind count
  const counts = runCmd(`git rev-list --left-right --count origin/${BASE_BRANCH}...HEAD`, { pipe: true });
  const [behind, ahead] = counts.split(/\s+/).map(Number);
  console.log(`Branch status relative to origin/${BASE_BRANCH}: ${ahead} commit(s) ahead, ${behind} commit(s) behind.`);

  if (behind > 0) {
    console.warn(`\n[WARNING] Your branch is ${behind} commit(s) behind origin/${BASE_BRANCH}.`);
    console.warn(`It is recommended to merge origin/${BASE_BRANCH} before opening a PR.`);
  }

  if (ahead === 0) {
    console.error(`\n[ERROR] Branch '${currentBranch}' has 0 commits ahead of origin/${BASE_BRANCH}. Nothing to pull request.`);
    process.exit(1);
  }

  // 5. Check if an open PR already exists
  console.log('\nChecking for existing pull requests...');
  const existingPR = await checkExistingPR(currentBranch);
  if (existingPR) {
    console.log(`\n[INFO] An open pull request already exists for branch '${currentBranch}':`);
    console.log(`  PR #${existingPR.number}: ${existingPR.title}`);
    console.log(`  URL: ${existingPR.url}`);
    console.log(`Skipping PR creation to prevent duplicates.`);
    process.exit(0);
  }
  console.log('✓ No duplicate open PR found.');

  // 6. Run frontend verification checks
  console.log('\n=== Running Frontend Quality Gates ===\n');
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const checks = [
    { name: 'TypeScript Typecheck', cmd: `${npmCmd} run typecheck` },
    { name: 'ESLint Code Quality', cmd: `${npmCmd} run lint` },
    { name: 'Vitest Unit & Integration Tests', cmd: `${npmCmd} test` },
    { name: 'Production Bundle Build', cmd: `${npmCmd} run build` },
  ];

  const results = [];
  for (const check of checks) {
    console.log(`--> Running ${check.name} (${check.cmd})...`);
    const start = Date.now();
    try {
      execSync(check.cmd, { cwd: frontendDir, stdio: 'inherit', shell: true });
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`✓ ${check.name} PASSED (${duration}s)\n`);
      results.push({ name: check.name, status: 'PASSED', duration: `${duration}s` });
    } catch (error) {
      console.error(`\n[ERROR] ${check.name} failed.\n`);
      process.exit(1);
    }
  }

  // 7. Formulate PR title and description
  console.log('Generating PR title and description from commits...');
  const topCommitSubject = runCmd('git log -1 --format=%s', { pipe: true });
  const commitSummary = runCmd(`git log origin/${BASE_BRANCH}..HEAD --format="- %h: %s"`, { pipe: true });

  const prTitle = topCommitSubject;
  const prBody = `## Pull Request Overview

This pull request was prepared and verified for branch \`${currentBranch}\` targeting \`${BASE_BRANCH}\`.

### Included Commits (${ahead})
${commitSummary}

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
`;

  console.log(`PR Title: ${prTitle}`);

  // 8. Create PR targeting main
  let prCreatedUrl = null;
  let hasGhCli = false;

  try {
    execSync('gh --version', { stdio: 'pipe', shell: true });
    hasGhCli = true;
  } catch {
    hasGhCli = false;
  }

  if (hasGhCli) {
    console.log('\nCreating PR using GitHub CLI (gh)...');
    try {
      const created = execSync(
        `gh pr create --base ${BASE_BRANCH} --head "${currentBranch}" --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}"`,
        { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe', shell: true }
      ).trim();
      prCreatedUrl = created;
      console.log(`✓ Pull request created: ${prCreatedUrl}`);

      // Attempt auto-merge configuration
      try {
        execSync(`gh pr merge "${prCreatedUrl}" --auto --squash`, { cwd: repoRoot, stdio: 'pipe', shell: true });
        console.log(`✓ Auto-merge enabled (will merge automatically once required checks and approvals pass).`);
      } catch {
        console.log(`Notice: Auto-merge requires repository approval; PR remains open for review.`);
      }
    } catch (err) {
      console.error('Failed to create PR via gh CLI:', err.message);
    }
  } else {
    console.log('\n[INFO] GitHub CLI (gh) is not installed locally.');
    console.log('Pushing branch to origin so GitHub Actions (.github/workflows/auto-pr.yml) can create the PR:');
    try {
      runCmd(`git push origin "${currentBranch}"`);
      console.log(`✓ Successfully pushed '${currentBranch}' to origin.`);
      console.log(`GitHub Actions Auto-PR workflow will now process this branch automatically.`);
    } catch (err) {
      console.warn(`Notice on git push: ${err.message}`);
    }

    const webCompareUrl = `https://github.com/${REPO_FULL}/compare/${BASE_BRANCH}...${encodeURIComponent(currentBranch)}?expand=1`;
    console.log(`\nDirect PR creation link:`);
    console.log(`  ${webCompareUrl}`);
  }

  console.log('\n=== Quality Gate Verification Summary ===');
  results.forEach((r) => console.log(`✓ ${r.name}: ${r.status} (${r.duration})`));
  if (prCreatedUrl) {
    console.log(`\nPull Request URL: ${prCreatedUrl}`);
  }
}

main().catch((err) => {
  console.error('\nUnexpected failure:', err);
  process.exit(1);
});
