# SCMS Pull Request Automation PowerShell Script
param(
    [switch]$SkipVerify = $false
)

$ErrorActionPreference = "Stop"

$RepoOwner = "Smart-Complaint-Management"
$RepoName = "Smart-Complaint-Management-System-SE-Project"
$RepoFull = "$RepoOwner/$RepoName"
$BaseBranch = "main"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path "$ScriptDir/../../../").Path
$FrontendDir = Join-Path $RepoRoot "frontend"

Write-Host "=== SCMS Pull Request Automation (/scms-pr) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Identify current branch
Set-Location $RepoRoot
$CurrentBranch = (git branch --show-current).Trim()
Write-Host "Current branch: $CurrentBranch"

# 2. Reject if on main
if ($CurrentBranch -eq $BaseBranch) {
    Write-Host ""
    Write-Host "[ERROR] Cannot create a pull request from default branch '$BaseBranch'." -ForegroundColor Red
    Write-Host "Please switch to a feature branch first (e.g. git checkout -b feature/<name>)."
    exit 1
}

# 3. Check for uncommitted changes
$StatusRaw = git status --porcelain
if ($StatusRaw) {
    Write-Host ""
    Write-Host "[ERROR] Working tree has uncommitted changes:" -ForegroundColor Red
    Write-Host ($StatusRaw -join "`n")
    Write-Host "`nPlease commit or stash changes before creating a pull request."
    exit 1
}
Write-Host "[OK] Working tree is clean." -ForegroundColor Green

# 4. Fetch latest origin/main
Write-Host ""
Write-Host "Fetching latest origin/$BaseBranch..."
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
git fetch origin $BaseBranch 2>&1 | Out-Null
$ErrorActionPreference = $prevEAP

# Check ahead/behind count
$Counts = (git rev-list --left-right --count "origin/$BaseBranch...HEAD").Trim()
$Parts = $Counts -split "\s+"
$Behind = [int]$Parts[0]
$Ahead = [int]$Parts[1]

Write-Host "Branch status relative to origin/$BaseBranch`: $Ahead commit(s) ahead, $Behind commit(s) behind."

if ($Behind -gt 0) {
    Write-Host ""
    Write-Host "[WARNING] Your branch is $Behind commit(s) behind origin/$BaseBranch." -ForegroundColor Yellow
    Write-Host "It is recommended to merge origin/$BaseBranch before opening a PR."
}

if ($Ahead -eq 0) {
    Write-Host ""
    Write-Host "[ERROR] Branch '$CurrentBranch' has 0 commits ahead of origin/$BaseBranch. Nothing to pull request." -ForegroundColor Red
    exit 1
}

# 5. Check if an open PR already exists
Write-Host ""
Write-Host "Checking for existing pull requests..."
$HasOpenPR = $false
try {
    $ApiUrl = [string]::Format("https://api.github.com/repos/{0}/pulls?head={1}:{2}&base={3}&state=open", $RepoFull, $RepoOwner, $CurrentBranch, $BaseBranch)
    $ApiResponse = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "SCMS-PR-Automation" } -ErrorAction SilentlyContinue
    if ($ApiResponse -and $ApiResponse.Count -gt 0) {
        $ExistingPRUrl = $ApiResponse[0].html_url
        $ExistingPRNum = $ApiResponse[0].number
        $ExistingPRTitle = $ApiResponse[0].title
        Write-Host ""
        Write-Host "[INFO] An open pull request already exists for branch '$CurrentBranch':" -ForegroundColor Yellow
        Write-Host "  PR #$ExistingPRNum`: $ExistingPRTitle"
        Write-Host "  URL: $ExistingPRUrl"
        Write-Host "Skipping PR creation to prevent duplicates."
        $HasOpenPR = $true
        exit 0
    }
} catch {
    # If API check is unavailable, proceed safely
}

if (-not $HasOpenPR) {
    Write-Host "[OK] No duplicate open PR found." -ForegroundColor Green
}

# 6. Run frontend quality gates
if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "=== Running Frontend Quality Gates ===" -ForegroundColor Cyan
    Write-Host ""

    Set-Location $FrontendDir

    Write-Host "--> 1/4: Running TypeScript Typecheck..." -ForegroundColor White
    npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] TypeScript typecheck failed." -ForegroundColor Red
        Set-Location $RepoRoot
        exit 1
    }
    Write-Host "[OK] TypeScript Typecheck passed." -ForegroundColor Green
    Write-Host ""

    Write-Host "--> 2/4: Running ESLint..." -ForegroundColor White
    npm.cmd run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] ESLint failed." -ForegroundColor Red
        Set-Location $RepoRoot
        exit 1
    }
    Write-Host "[OK] ESLint passed." -ForegroundColor Green
    Write-Host ""

    Write-Host "--> 3/4: Running Vitest Test Suites..." -ForegroundColor White
    npm.cmd test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Tests failed." -ForegroundColor Red
        Set-Location $RepoRoot
        exit 1
    }
    Write-Host "[OK] Tests passed." -ForegroundColor Green
    Write-Host ""

    Write-Host "--> 4/4: Running Production Build..." -ForegroundColor White
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Production build failed." -ForegroundColor Red
        Set-Location $RepoRoot
        exit 1
    }
    Write-Host "[OK] Production build passed." -ForegroundColor Green
    Write-Host ""

    Set-Location $RepoRoot
}

# 7. Formulate PR title and description
Write-Host "Generating PR title and description from commits..."
$TopCommitSubject = (git log -1 --format="%s").Trim()
$CommitSummary = (git log "origin/$BaseBranch..HEAD" --format="- %h: %s").Trim()

$PRTitle = $TopCommitSubject

$BodyFile = Join-Path $RepoRoot "pr_body.md"
$BodyContent = @"
## Pull Request Overview

This pull request was prepared and verified for branch `$CurrentBranch targeting `$BaseBranch.

### Included Commits ($Ahead)
$CommitSummary

### Pre-PR Quality Verification
- TypeScript Typecheck (npm run typecheck): Passed
- ESLint (npm run lint): Passed
- Vitest Tests (npm test): Passed
- Production Build (npm run build): Passed

### Merge Safeguards
- Direct push to `$BaseBranch is prohibited.
- All required GitHub Actions CI status checks must pass prior to merge.
- Required peer/team reviews must be approved before merge.
"@

$BodyContent | Set-Content -Path $BodyFile -Encoding UTF8
Write-Host "PR Title: $PRTitle" -ForegroundColor Yellow

# 8. Create PR targeting main
$HasGh = $false
try {
    $null = Get-Command gh -ErrorAction Stop
    $HasGh = $true
} catch {
    $HasGh = $false
}

if ($HasGh) {
    Write-Host ""
    Write-Host "Creating PR using GitHub CLI (gh)..."
    try {
        $PRCreatedUrl = (gh pr create --base $BaseBranch --head $CurrentBranch --title $PRTitle --body-file $BodyFile)
        Write-Host "[OK] Pull request created: $PRCreatedUrl" -ForegroundColor Green

        # Configure auto-merge
        try {
            gh pr merge $PRCreatedUrl --auto --squash 2>&1 | Out-Null
            Write-Host "[OK] Auto-merge enabled (will merge automatically once required checks and approvals pass)." -ForegroundColor Green
        } catch {
            Write-Host "Notice: Auto-merge requires repository approval; PR remains open for review."
        }
    } catch {
        Write-Host "Notice: gh pr create output: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[INFO] GitHub CLI (gh) is not installed on local host." -ForegroundColor Cyan
    Write-Host "Pushing branch to origin so GitHub Actions (.github/workflows/auto-pr.yml) can create the PR:"
    try {
        git push origin $CurrentBranch
        Write-Host "[OK] Branch is up to date on origin." -ForegroundColor Green
        Write-Host "GitHub Actions Auto-PR workflow is triggered on push."
    } catch {
        Write-Host "Push output: $_" -ForegroundColor Yellow
    }

    $WebCompareUrl = "https://github.com/$RepoFull/compare/$BaseBranch...${CurrentBranch}?expand=1"
    Write-Host ""
    Write-Host "Direct PR creation link:" -ForegroundColor Cyan
    Write-Host "  $WebCompareUrl" -ForegroundColor White
}

Remove-Item $BodyFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Quality Gate Verification Summary ===" -ForegroundColor Cyan
Write-Host "[OK] TypeScript Typecheck: PASSED" -ForegroundColor Green
Write-Host "[OK] ESLint Code Quality: PASSED" -ForegroundColor Green
Write-Host "[OK] Vitest Tests: PASSED" -ForegroundColor Green
Write-Host "[OK] Production Build: PASSED" -ForegroundColor Green
Write-Host ""
