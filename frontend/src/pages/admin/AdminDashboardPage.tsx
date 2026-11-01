import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Inbox,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { AdminMetricCards } from '@/components/admin/AdminMetricCards';
import { getReportComplaints } from '@/services/adminReportService';
import {
  computeDashboardMetrics,
  filterDashboardComplaints,
} from '@/services/adminDashboardService';
import { statusLabels, priorityLabels } from '@/data/mockData';
import type { Complaint } from '@/types';

export function AdminDashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>(getReportComplaints);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    try {
      const fresh = getReportComplaints();
      setComplaints(fresh);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  // Performance-optimized (SCMS-81): Compute core metrics in a single memoized pass using shared service
  const {
    total,
    openCount,
    resolvedCount,
    escalatedCount,
    unassignedComplaints,
    recentComplaints,
    needsAttentionComplaints,
    escalatedList,
  } = useMemo(() => computeDashboardMetrics(complaints), [complaints]);

  // Memoized search & filter logic using shared service (SCMS-41, SCMS-81)
  const filteredComplaints = useMemo(
    () => filterDashboardComplaints(complaints, searchQuery, statusFilter, priorityFilter),
    [complaints, searchQuery, statusFilter, priorityFilter]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview of complaint activity across the university platform."
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh dashboard data"
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-accent-600' : ''}`}
            />
            Refresh
          </button>
        }
      />

      {/* Summary Metrics (SCMS-38, SCMS-85) */}
      <AdminMetricCards
        total={total}
        open={openCount}
        resolved={resolvedCount}
        escalated={escalatedCount}
      />

      {/* Unassigned complaints alert banner (SCMS-34, SCMS-40) */}
      {unassignedComplaints.length > 0 && (
        <div className="card mt-6 flex items-center gap-4 border-accent-200 bg-accent-50/40 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
            <Inbox className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-ink-800">
              {unassignedComplaints.length} complaint
              {unassignedComplaints.length !== 1 ? 's' : ''} awaiting department assignment
            </p>
            <p className="text-xs text-ink-500">
              Review and allocate these complaints to the appropriate support teams.
            </p>
          </div>

          <Link
            to="/admin/assignments"
            className="btn btn-secondary shrink-0"
          >
            Review <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Search and Filters Section (SCMS-41) */}
      <section className="card mt-8 p-5" aria-labelledby="filter-heading">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-accent-600" />
          <div>
            <h2 id="filter-heading" className="text-base font-semibold text-ink-900">
              Search & Filter Complaints
            </h2>
            <p className="text-xs text-ink-500">
              Filter registered complaints by ID, subject keywords, lifecycle status, or priority level.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search box */}
          <div>
            <label
              htmlFor="dashboard-search-input"
              className="mb-1.5 block text-xs font-medium text-ink-700"
            >
              Search Keywords
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="dashboard-search-input"
                type="text"
                placeholder="Search ID, subject, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label
              htmlFor="dashboard-status-select"
              className="mb-1.5 block text-xs font-medium text-ink-700"
            >
              Status
            </label>
            <select
              id="dashboard-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {Object.entries(statusLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label
              htmlFor="dashboard-priority-select"
              className="mb-1.5 block text-xs font-medium text-ink-700"
            >
              Priority
            </label>
            <select
              id="dashboard-priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input text-sm cursor-pointer"
            >
              <option value="all">All Priorities</option>
              {Object.entries(priorityLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter status & clear action */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
          <p className="text-xs text-ink-500" aria-live="polite">
            Showing <span className="font-semibold text-ink-900">{filteredComplaints.length}</span> of {total} complaints
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:text-accent-800"
            >
              <X className="h-3.5 w-3.5" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Results table or empty state */}
        <div className="mt-4">
          {filteredComplaints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink-200 bg-surface px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink-700">
                No complaints match your search or filter criteria.
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Try adjusting your search terms or clearing selected filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-secondary mt-3 text-xs"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <ComplaintTable
              complaints={filteredComplaints}
              showPriority
              showAssignedTo
              showEscalation
            />
          )}
        </div>
      </section>

      {/* Overview Panels: Recent, Needs Attention, Escalated */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent complaints (SCMS-39) */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">
              Recent Complaints
            </h2>

            <Link
              to="/admin/complaints"
              className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card">
            <ComplaintTable
              complaints={recentComplaints}
              showPriority
              showAssignedTo
              showEscalation
            />
          </div>
        </div>

        {/* Complaints requiring attention (SCMS-39, SCMS-40) */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink-900">
              Requires Attention
            </h2>
          </div>

          <div className="card divide-y divide-ink-100">
            {needsAttentionComplaints.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No complaints require immediate attention.
              </p>
            ) : (
              needsAttentionComplaints.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {c.subject}
                    </p>
                    <p className="font-mono text-xs text-ink-400">
                      {c.id} · Priority: {c.priority}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Escalated complaints */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">
              Escalated Complaints
            </h2>

            <Link
              to="/admin/escalations"
              className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card divide-y divide-ink-100">
            {escalatedList.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No escalated complaints.
              </p>
            ) : (
              escalatedList.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-accent-700">
                      {c.subject}
                    </p>
                    <p className="font-mono text-xs text-ink-400">
                      {c.id} · Status: {c.status}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-accent-500" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
