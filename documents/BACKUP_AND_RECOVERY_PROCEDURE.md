# Backup and Recovery Procedure

**Smart Complaint Management System (SCMS)**  
**Document Reference:** SCMS-84 / NFR-Backup-Recovery  
**Target Audience:** System Administrators, DevOps Engineers, QA Engineers, Database Administrators  
**Applicability:** Production, Staging, and Local Disaster Recovery  

---

## 1. Purpose & Quality Objectives

The purpose of this procedure is to define, standardize, and verify data protection and disaster recovery procedures for the **Smart Complaint Management System (SCMS)**. 

### 1.1 Recovery Objectives

| Metric | Target | Description |
|---|---|---|
| **RPO (Recovery Point Objective)** | **≤ 24 Hours** | Maximum acceptable data loss period in the event of an unrecoverable failure. Addressed via daily scheduled database dumps. |
| **RTO (Recovery Time Objective)** | **≤ 1 Hour** | Maximum allowable downtime to restore full system operations and verify data integrity following a disaster. |
| **Backup Integrity Rate** | **100%** | All backup artifacts must have verifiable checksums (`SHA-256`) and valid relational schemas upon restoration. |

---

## 2. Storage Architecture & Scope

The system utilizes a dual-tier persistence model:

1. **Relational Database Management System (MySQL):**
   - **Database Name:** `smart_complaint_db`
   - **Primary Tables:**
     - `users`: User and administrator credentials, password hashes (Argon2id/Bcrypt), roles (`user`, `admin`).
     - `complaints`: Core complaint submissions, subjects, descriptions, categories, priorities, statuses, escalation flags.
     - `complaint_status_history`: Immutable chronological log of status transitions, actors, and notes.
     - `notifications`: User-scoped and event-driven notifications (`status_update`, `assignment`, `escalation`, `resolution`).
     - `schema_migrations`: Migration tracking (`V2__authentication_and_statuses.sql`, `V3__notifications.sql`).

2. **Client-Side Unified Application State (`localStorage`):**
   - Keys: `scms_complaints`, `scms_complaint_updates`, `scms_admin_audit`, `scms_notifications`, `scms_migration_applied_v1`.
   - Client backup via structured CSV export and automated migration recovery.

---

## 3. MySQL Database Backup Procedures

### 3.1 Logical Backup via `mysqldump`

For transactional consistency without locking tables, logical dumps MUST use the `--single-transaction` and `--quick` flags:

```bash
mysqldump \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-3306}" \
  --user="${DB_USER:-group8}" \
  --password \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --databases smart_complaint_db > "backup_smart_complaint_db_$(date +%Y%m%d_%H%M%S).sql"
```

### 3.2 Automated PowerShell Backup Script (`backup_mysql.ps1`)

For Windows deployment environments:

```powershell
<#
.SYNOPSIS
  Automated backup script for Smart Complaint Management System MySQL database.
.EXAMPLE
  .\backup_mysql.ps1 -BackupDirectory "C:\backups\scms" -RetentionDays 14
#>
param(
    [string]$BackupDirectory = "C:\backups\scms",
    [string]$DatabaseName = "smart_complaint_db",
    [string]$DbUser = "group8",
    [string]$DbHost = "localhost",
    [int]$DbPort = 3306,
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDirectory)) {
    New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDirectory "scms_backup_${DatabaseName}_${Timestamp}.sql"
$CompressedFile = "${BackupFile}.gz"
$ChecksumFile = "${CompressedFile}.sha256"

Write-Host "[BACKUP] Starting backup for $DatabaseName at $Timestamp..."

# Execute mysqldump with consistent snapshot
$dumpArgs = @(
    "--host=$DbHost",
    "--port=$DbPort",
    "--user=$DbUser",
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    $DatabaseName
)

& mysqldump @dumpArgs | Out-File -FilePath $BackupFile -Encoding utf8

if ($LASTEXITCODE -ne 0) {
    throw "mysqldump failed with exit code $LASTEXITCODE"
}

# Generate SHA-256 Checksum
$hash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
Set-Content -Path $ChecksumFile -Value "$hash *$BackupFile"

Write-Host "[BACKUP] Backup completed: $BackupFile (SHA256: $hash)"

# Retention pruning: Remove backups older than RetentionDays
Get-ChildItem -Path $BackupDirectory -Filter "scms_backup_*.sql*" | Where-Object {
    $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays)
} | Remove-Item -Force

Write-Host "[BACKUP] Retention policy applied ($RetentionDays days retained)."
```

### 3.3 Automated Bash Backup Script (`backup_mysql.sh`)

For Linux / Containerized deployment environments:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/scms}"
DB_NAME="${DB_NAME:-smart_complaint_db}"
DB_USER="${DB_USER:-group8}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/scms_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "[$(date -Iseconds)] Starting backup for ${DB_NAME} on ${DB_HOST}..."

# Export compressed dump with single-transaction consistency
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip -c > "${BACKUP_FILE}"

# Generate checksum
sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[$(date -Iseconds)] Backup written: ${BACKUP_FILE}"
echo "[$(date -Iseconds)] Checksum: $(cat "${CHECKSUM_FILE}")"

# Prune old backups
find "${BACKUP_DIR}" -type f -name "scms_backup_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date -Iseconds)] Pruned backups older than ${RETENTION_DAYS} days."
```

### 3.4 Backup Schedule & Retention Policy

| Tier | Frequency | Retention Window | Storage Target |
|---|---|---|---|
| **Daily Incremental/Snapshot** | Every 24 hours (02:00 UTC) | 14 Days | Local persistent disk + offsite cloud bucket |
| **Weekly Snapshot** | Every Sunday (03:00 UTC) | 8 Weeks | Encrypted cold storage (e.g., S3 Glacier / Cloud Storage Archive) |
| **Pre-Migration Snapshot** | Immediately before applying SQL migrations | Indefinite / Pre-release archive | Stored alongside release deployment artifacts |

---

## 4. Recovery & Restoration Procedures

### 4.1 Prerequisites for Restoration

1. Target MySQL instance is running and accessible.
2. Administrative credentials with `CREATE`, `DROP`, `ALTER`, `INDEX`, `INSERT`, `SELECT`, `UPDATE` privileges.
3. Verification that the backup archive checksum matches its `.sha256` digest file.

### 4.2 Verification of Backup Integrity Prior to Restore

```bash
# Verify checksum
sha256sum -c "scms_backup_smart_complaint_db_20261108_020000.sql.gz.sha256"
```

If the verification fails, do NOT restore from this file. Use the immediately preceding verified backup snapshot.

### 4.3 Database Restoration Execution

#### Step 1: Ensure Clean Database Schema (Optional/Emergency Clean Restore)
If recreating the database from scratch:

```sql
DROP DATABASE IF EXISTS smart_complaint_db;
CREATE DATABASE smart_complaint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Step 2: Ingest the SQL Dump File

```bash
# For uncompressed dump:
mysql -u "${DB_USER}" -p smart_complaint_db < backup_file.sql

# For compressed dump (.sql.gz):
gunzip < backup_file.sql.gz | mysql -u "${DB_USER}" -p smart_complaint_db
```

### 4.4 Post-Restoration Verification Checklist

Execute the following queries to ensure data consistency post-recovery:

```sql
USE smart_complaint_db;

-- 1. Check table existence
SHOW TABLES;
-- Expected: users, complaints, complaint_status_history, notifications

-- 2. Verify row counts
SELECT 'users' AS table_name, COUNT(*) AS total_rows FROM users
UNION ALL
SELECT 'complaints', COUNT(*) FROM complaints
UNION ALL
SELECT 'complaint_status_history', COUNT(*) FROM complaint_status_history
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- 3. Verify foreign key integrity
SELECT c.id, c.subject
FROM complaints c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL AND c.user_id IS NOT NULL;
-- Expected: 0 orphaned rows

-- 4. Check for status consistency
SELECT status, COUNT(*) FROM complaints GROUP BY status;
```

### 4.5 Recovery from a Failed Database Migration

If a migration (such as `V2__authentication_and_statuses.sql`) fails midway:

1. **Stop Application Service:**
   ```bash
   pkill -f "gunicorn app:app" || true
   ```
2. **Restore Pre-Migration Dump:**
   ```bash
   mysql -u "${DB_USER}" -p smart_complaint_db < pre_migration_backup.sql
   ```
3. **Verify Health Endpoint:**
   ```bash
   curl -s http://localhost:5000/db-health
   # Expected response: {"database":"available","status":"healthy"}
   ```
4. **Restart Application Service:**
   ```bash
   python -m gunicorn app:app --bind 0.0.0.0:5000
   ```

---

## 5. Client-Side & Local Storage Recovery

For the client application and administrative reporting layer:

### 5.1 Administrative CSV Disaster Recovery Export

Administrators can generate a point-in-time snapshot of all complaint records at any time:
1. Navigate to `/admin/reports`.
2. Click **Download CSV**.
3. The resulting file (`complaint-reports-YYYY-MM-DD.csv`) contains:
   - Complaint ID
   - Subject & Description
   - Category & Status
   - Priority & Submitter
   - Assigned Department
   - Timestamps & Escalation Indicators
4. This export provides offline record preservation and auditable paper trail.

### 5.2 Browser Storage Quota Recovery (`dataMigrationService`)

When browser storage is corrupted, cleared, or exceeds quota:
- The system gracefully handles errors using `safeGetJson` and `safeSetJson` in `dataMigrationService.ts`.
- Legacy keys (`scms-complaint-assignments`, `scms-assignment-audit`) are preserved and merged idempotently into `scms_complaints` without overwriting unassigned primary complaints.
- Administrative audit events roll back transactions if persistence fails (`recordAdminAction`), ensuring zero silently lost audit records.

---

## 6. Disaster Recovery Drill Schedule

To ensure this procedure remains operational and verified:

1. **Drill Frequency:** Semi-annually (every 6 months) or following any major database schema migration.
2. **Procedure:** 
   - A secondary test database instance (`smart_complaint_db_recovery_test`) is created.
   - The latest automated backup is restored onto the test database.
   - Automated tests (`backend/tests/test_status_authorization.py`) are executed against the restored instance.
   - The test database is dropped upon successful verification.
3. **Sign-off:** The QA Lead (Shasank S K) and Admin & Data Engineer (Samartha M S) verify and sign off on drill results.
