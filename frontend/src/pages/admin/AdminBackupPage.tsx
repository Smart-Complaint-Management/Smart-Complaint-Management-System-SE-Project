
import { useRef, useState } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  FileJson,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { getAdminComplaints } from '@/data/adminComplaintData';
import type { Complaint } from '@/types';

const ASSIGNMENTS_KEY = 'scms-complaint-assignments';
const AUDIT_KEY = 'scms-assignment-audit';
const BACKUP_FORMAT = 'SCMS_BACKUP';
const BACKUP_VERSION = 1;

type BackupAuditEntry = {
  id?: string;
  complaintId: string;
  action: 'ASSIGNED' | 'REASSIGNED';
  previousTeam: string | null;
  newTeam: string;
  timestamp: string;
  performedBy?: string;
};

type BackupData = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  complaints: Complaint[];
  auditEntries: BackupAuditEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComplaint(value: unknown): value is Complaint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.description === 'string' &&
    typeof value.category === 'string' &&
    typeof value.status === 'string' &&
    typeof value.priority === 'string' &&
    typeof value.submittedBy === 'string' &&
    (typeof value.assignedTo === 'string' || value.assignedTo === null) &&
    typeof value.submittedAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.isEscalated === 'boolean' &&
    (typeof value.possibleDuplicateId === 'string' ||
      value.possibleDuplicateId === null)
  );
}

function isAuditEntry(value: unknown): value is BackupAuditEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.complaintId === 'string' &&
    (value.action === 'ASSIGNED' || value.action === 'REASSIGNED') &&
    (typeof value.previousTeam === 'string' ||
      value.previousTeam === null) &&
    typeof value.newTeam === 'string' &&
    typeof value.timestamp === 'string' &&
    (value.id === undefined || typeof value.id === 'string') &&
    (value.performedBy === undefined ||
      typeof value.performedBy === 'string')
  );
}

function makeBackup(): BackupData {
  let auditEntries: BackupAuditEntry[] = [];

  try {
    const savedAudit = localStorage.getItem(AUDIT_KEY);

    if (savedAudit) {
      const parsed: unknown = JSON.parse(savedAudit);

      if (Array.isArray(parsed) && parsed.every(isAuditEntry)) {
        auditEntries = parsed;
      } else {
        throw new Error('The stored assignment history is invalid.');
      }
    }
  } catch {
    throw new Error(
      'Could not read assignment history. No backup was downloaded.',
    );
  }

  const complaints = getAdminComplaints();

  if (!complaints.every(isComplaint)) {
    throw new Error(
      'Complaint data is invalid. No backup was downloaded.',
    );
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    complaints,
    auditEntries,
  };
}

function validateBackup(value: unknown): BackupData {
  if (!isRecord(value)) {
    throw new Error('The file must contain a valid JSON object.');
  }

  if (value.format !== BACKUP_FORMAT) {
    throw new Error('This is not an SCMS backup file.');
  }

  if (value.version !== BACKUP_VERSION) {
    throw new Error('This backup version is not supported.');
  }

  if (
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt))
  ) {
    throw new Error('The backup date is missing or invalid.');
  }

  if (
    !Array.isArray(value.complaints) ||
    !value.complaints.every(isComplaint)
  ) {
    throw new Error('The backup contains invalid complaint records.');
  }

  if (
    !Array.isArray(value.auditEntries) ||
    !value.auditEntries.every(isAuditEntry)
  ) {
    throw new Error('The backup contains invalid audit records.');
  }

  const ids = value.complaints.map((complaint) => complaint.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error('The backup contains duplicate complaint IDs.');
  }

  return value as unknown as BackupData;
}

export function AdminBackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingBackup, setPendingBackup] =
    useState<BackupData | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  function handleExport() {
    setMessage('');
    setError('');

    try {
      const backup = makeBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        'scms-backup-' +
        new Date().toISOString().replace(/[:.]/g, '-') +
        '.json';

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage(
        'Backup downloaded successfully. Store the file somewhere safe.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create the backup.',
      );
    }
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    setMessage('');
    setError('');
    setPendingBackup(null);
    setSelectedFileName('');

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select an SCMS JSON backup file.');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const backup = validateBackup(parsed);

      setPendingBackup(backup);
      setSelectedFileName(file.name);
      setMessage(
        'Backup validated. Review the details before restoring.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not read this backup file.',
      );
    }

    event.target.value = '';
  }

  function handleRestore() {
    if (!pendingBackup) {
      setError('Select and validate a backup file first.');
      return;
    }

    const confirmed = window.confirm(
      'Restore ' +
        pendingBackup.complaints.length +
        ' complaints and ' +
        pendingBackup.auditEntries.length +
        ' audit records? Current browser-stored records will be replaced.',
    );

    if (!confirmed) {
      return;
    }

    setMessage('');
    setError('');

    const previousAssignments =
      localStorage.getItem(ASSIGNMENTS_KEY);
    const previousAudit = localStorage.getItem(AUDIT_KEY);

    try {
      localStorage.setItem(
        ASSIGNMENTS_KEY,
        JSON.stringify(pendingBackup.complaints),
      );

      localStorage.setItem(
        AUDIT_KEY,
        JSON.stringify(pendingBackup.auditEntries),
      );

      setMessage(
        'Backup restored. Reload the application pages to display the restored data.',
      );

      setPendingBackup(null);
      setSelectedFileName('');
    } catch (err) {
      // Attempt to return both storage entries to their previous values.
      try {
        if (previousAssignments === null) {
          localStorage.removeItem(ASSIGNMENTS_KEY);
        } else {
          localStorage.setItem(
            ASSIGNMENTS_KEY,
            previousAssignments,
          );
        }

        if (previousAudit === null) {
          localStorage.removeItem(AUDIT_KEY);
        } else {
          localStorage.setItem(AUDIT_KEY, previousAudit);
        }
      } catch (rollbackError) {
        console.error('Storage rollback failed:', rollbackError);
      }

      setError(
        err instanceof Error
          ? 'Restore failed: ' + err.message
          : 'Restore failed. Browser storage could not be updated.',
      );
    }
  }

  function cancelRestore() {
    setPendingBackup(null);
    setSelectedFileName('');
    setMessage('');
    setError('');
  }

  return (
    <div>
      <PageHeader
        title="Backup & Recovery"
        description="Export complaint data and restore it from a validated SCMS backup."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Demo storage limitation</p>
          <p className="mt-1">
            Backups cover this browser's complaint assignment data and
            assignment history. They do not back up a server database,
            user accounts, or other application data.
          </p>
        </div>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <Download className="h-5 w-5" />
          </div>

          <h2 className="text-lg font-semibold text-ink-900">
            Create a backup
          </h2>

          <p className="mt-2 text-sm leading-6 text-ink-500">
            Download a JSON file containing the latest complaint records
            available to the admin pages and assignment audit history.
          </p>

          <button
            type="button"
            className="btn btn-primary mt-5 inline-flex items-center gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Download JSON backup
          </button>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
            <Upload className="h-5 w-5" />
          </div>

          <h2 className="text-lg font-semibold text-ink-900">
            Restore a backup
          </h2>

          <p className="mt-2 text-sm leading-6 text-ink-500">
            Select a previously exported SCMS JSON file. The file is
            validated before you can confirm a restore.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelection}
          />

          <button
            type="button"
            className="btn btn-primary mt-5 inline-flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="h-4 w-4" />
            Choose backup file
          </button>

          {pendingBackup && (
            <div className="mt-5 rounded-lg border border-ink-200 p-4">
              <p className="break-all text-sm font-medium text-ink-900">
                {selectedFileName}
              </p>

              <div className="mt-3 space-y-1 text-sm text-ink-600">
                <p>
                  Complaints: {pendingBackup.complaints.length}
                </p>
                <p>
                  Audit records: {pendingBackup.auditEntries.length}
                </p>
                <p>
                  Backup date:{' '}
                  {new Date(
                    pendingBackup.exportedAt,
                  ).toLocaleString()}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center gap-2"
                  onClick={handleRestore}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Confirm restore
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelRestore}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs leading-5 text-ink-400">
        Keep downloaded backups in a secure location. Anyone with access to
        a backup file may be able to read its complaint information.
        Browser storage is not a tamper-proof database.
      </p>
    </div>
  );
}
