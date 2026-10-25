import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/pages/auth/authContext';
import { mockComplaints } from '@/data/mockData';
import { formatDate } from '@/services/api';

export function UserTrackPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const myComplaints = useMemo(
    () => mockComplaints.filter((c) => c.submittedBy === session?.fullName),
    [session?.fullName],
  );

  const matches = useMemo(() => {
    if (query.trim() === '') return myComplaints;
    const q = query.toLowerCase();
    return myComplaints.filter(
      (c) => c.id.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q),
    );
  }, [myComplaints, query]);

  return (
    <div>
      <PageHeader
        title="Track a Complaint"
        description="Enter a complaint ID or subject to quickly find and track its progress."
      />

      <div className="card mb-6 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter complaint ID (e.g. CMP-2024-001) or subject..."
            className="input pl-9"
            aria-label="Search complaint to track"
          />
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No matching complaint found"
            description="Check the complaint ID and try again, or browse all your complaints."
            action={
              <Link to="/complaints" className="btn btn-secondary">
                Browse All Complaints
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-xs text-ink-400">
            {matches.length} complaint{matches.length !== 1 ? 's' : ''} matching your search
          </p>
          <div className="card divide-y divide-ink-100">
            {matches.map((complaint) => (
              <button
                key={complaint.id}
                onClick={() => navigate(`/complaints/${complaint.id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-50 group"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs font-medium text-ink-400">{complaint.id}</span>
                  <p className="mt-0.5 truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                    {complaint.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">Submitted {formatDate(complaint.submittedAt)}</p>
                </div>
                <StatusBadge status={complaint.status} />
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
