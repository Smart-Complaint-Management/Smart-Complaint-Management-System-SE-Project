import { useMemo, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAuth } from '../auth/authContext';
import {
  categoryLabels,
  statusLabels,
  priorityLabels,
} from '../../data/mockData';
import { getMyComplaints } from '../../services/complaintService';
import type { Complaint } from '../../types';

export function UserComplaintsPage() {
  const { session } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const myComplaints = useMemo(
    () => getMyComplaints(session),
    [session]
  );

  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return myComplaints.filter((complaint: Complaint) => {
      const matchesSearch =
        !query ||
        complaint.id.toLowerCase().includes(query) ||
        complaint.subject.toLowerCase().includes(query) ||
        complaint.description.toLowerCase().includes(query) ||
        categoryLabels[complaint.category].toLowerCase().includes(query) ||
        statusLabels[complaint.status].toLowerCase().includes(query) ||
        priorityLabels[complaint.priority].toLowerCase().includes(query);

      const matchesCategory =
        !categoryFilter || complaint.category === categoryFilter;

      const matchesStatus =
        !statusFilter || complaint.status === statusFilter;

      const matchesPriority =
        !priorityFilter || complaint.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    myComplaints,
    searchTerm,
    categoryFilter,
    statusFilter,
    priorityFilter,
  ]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStatusFilter('');
    setPriorityFilter('');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    categoryFilter !== '' ||
    statusFilter !== '' ||
    priorityFilter !== '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          My Complaints
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Search and track the status of your submitted complaints.
        </p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            aria-label="Search complaints"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ID, subject, description, category, status, or priority..."
            className="input w-full py-2.5 pl-10 pr-4"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-600">
            <Filter size={16} aria-hidden="true" />
            <span>Filters:</span>
          </div>

          <label htmlFor="my-complaints-category" className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Category
            <select
              id="my-complaints-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input py-2"
            >
              <option value="">All Categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label htmlFor="my-complaints-status" className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Status
            <select
              id="my-complaints-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input py-2"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label htmlFor="my-complaints-priority" className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Priority
            <select
              id="my-complaints-priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="input py-2"
            >
              <option value="">All Priorities</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-secondary inline-flex items-center gap-1 px-3 py-2 text-sm"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-ink-700" aria-live="polite">
        Showing <span className="font-semibold">{filteredComplaints.length}</span>{' '}
        of <span className="font-semibold">{myComplaints.length}</span>{' '}
        complaints
      </div>

      {filteredComplaints.length === 0 ? (
        <div className="card border-dashed px-6 py-12 text-center">
          <Search size={32} className="mx-auto mb-3 text-ink-500" aria-hidden="true" />

          <h2 className="text-lg font-semibold text-ink-900">
            {myComplaints.length === 0
              ? 'No complaints submitted yet'
              : 'No matching complaints found'}
          </h2>

          <p className="mt-2 text-sm text-ink-600">
            {myComplaints.length === 0
              ? 'Your submitted complaints will appear here.'
              : 'Try changing your search term or filters.'}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-secondary mt-4"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-ink-600">
                    Complaint
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-ink-600">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-ink-600">
                    Priority
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-ink-600">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-ink-600">
                    Submitted
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-100 bg-surface-card">
                {filteredComplaints.map((complaint: Complaint) => (
                  <tr key={complaint.id} className="hover:bg-ink-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-ink-900">
                        {complaint.subject}
                      </div>
                      <div className="mt-1 text-sm text-ink-600">
                        {complaint.id}
                      </div>
                      <p className="mt-1 max-w-md truncate text-sm text-ink-600">
                        {complaint.description}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-700">
                      {categoryLabels[complaint.category]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {priorityLabels[complaint.priority]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {statusLabels[complaint.status]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-700">
                      {new Date(complaint.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
