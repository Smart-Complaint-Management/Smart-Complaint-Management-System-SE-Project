import { useMemo, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  categoryLabels,
  statusLabels,
  priorityLabels,
} from '../../data/mockData';
import { getMyComplaints } from '../../services/complaintService';
import type { Complaint } from '../../types';

export default function UserComplaintsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">
          My Complaints
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search and track the status of your submitted complaints.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ID, subject, description, category, status, or priority..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={16} />
            <span>Filters:</span>
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Priorities</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{filteredComplaints.length}</span>{' '}
        of <span className="font-semibold">{myComplaints.length}</span>{' '}
        complaints
      </div>

      {filteredComplaints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Search size={32} className="mx-auto mb-3 text-gray-400" />

          <h2 className="text-lg font-semibold text-gray-900">
            {myComplaints.length === 0
              ? 'No complaints submitted yet'
              : 'No matching complaints found'}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {myComplaints.length === 0
              ? 'Your submitted complaints will appear here.'
              : 'Try changing your search term or filters.'}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Complaint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Submitted
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredComplaints.map((complaint: Complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {complaint.subject}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {complaint.id}
                      </div>
                      <p className="mt-1 max-w-md truncate text-sm text-gray-500">
                        {complaint.description}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                      {categoryLabels[complaint.category]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {priorityLabels[complaint.priority]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {statusLabels[complaint.status]}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
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
