
type AuditEntry = {
  id: string;
  complaintId: string;
  action: 'ASSIGNED' | 'REASSIGNED';
  previousTeam: string | null;
  newTeam: string;
  timestamp: string;
  performedBy: string;
};

export function AssignmentAuditHistory({
  auditEntries,
}: {
  auditEntries: AuditEntry[];
}) {
  const recentEntries = [...auditEntries].reverse();

  if (recentEntries.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        No assignment activity recorded yet. Assign or reassign a complaint
        to create an audit entry.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recentEntries.map((entry) => (
        <div
          key={entry.id}
          className="border-b border-ink-100 pb-3 last:border-0 last:pb-0"
        >
          <p className="text-sm font-medium text-ink-800">
            {entry.action === 'ASSIGNED' ? 'Assigned' : 'Reassigned'}{' '}
            {entry.complaintId}
          </p>

          <p className="mt-1 text-sm text-ink-600">
            {entry.previousTeam
              ? `${entry.previousTeam} → ${entry.newTeam}`
              : `Assigned to ${entry.newTeam}`}
          </p>

          <p className="mt-1 text-xs text-ink-400">
            Record ID: {entry.id}
          </p>

          <p className="mt-1 text-xs text-ink-400">
            {new Date(entry.timestamp).toLocaleString()}
            {' · '}
            {entry.performedBy}
          </p>
        </div>
      ))}
    </div>
  );
}
