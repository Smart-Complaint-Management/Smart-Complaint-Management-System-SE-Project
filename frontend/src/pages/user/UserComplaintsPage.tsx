```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileSearch } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  FilterControl,
  FilterBar,
  type FilterOption,
} from '@/components/ui/FilterControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { useAuth } from '@/pages/auth/authContext';

import {
  mockComplaints,
  categoryLabels,
  statusLabels,
  priorityLabels,
} from '@/data/mockData';

import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@/types';

const categoryOptions: FilterOption[] = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(categoryLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

const statusOptions: FilterOption[] = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

const priorityOptions: FilterOption[] = [
  { value: 'all', label: 'All Priorities' },
  ...Object.entries(priorityLabels).map(([value, label]) => ({
    value,
    label,
  })),
];

export function UserComplaintsPage() {
  const { session } = useAuth();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<ComplaintCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] =
    useState<ComplaintStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] =
    useState<ComplaintPriority | 'all'>('all');

  // Only show complaints belonging to the signed-in user.
  const myComplaints = useMemo(() => {
    if (!session || session.role !== 'user') {
      return [];
    }

    return mockComplaints.filter(
      (complaint) => complaint.submittedBy === session.fullName,
    );
  }, [session]);

  // Apply search and all selected filters together.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return myComplaints.filter((complaint) => {
      const searchableFields = [
        complaint.id,
        complaint.subject,
        complaint.description,
        complaint.category,
        categoryLabels[complaint.category] ?? '',
        complaint.status,
        statusLabels[complaint.status] ?? '',
        complaint.priority,
        priorityLabels[complaint.priority] ?? '',
      ];

      const matchesSearch =
        query === '' ||
        searchableFields.some((field) =>
          field.toLowerCase().includes(query),
        );

      const matchesCategory =
        categoryFilter === 'all' ||
        complaint.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        complaint.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    myComplaints,
    search,
    categoryFilter,
    statusFilter,
    priorityFilter,
  ]);

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
  }

  return (
    <div>
      <PageHeader
        title="My Complaints"
        description="Search and filter through all complaints you have registered."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            New Complaint
          </Link>
        }
      />

      <div className="card">
        <div className="border-b border-ink-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by ID, subject, description, category, status, or priority..."
              className="lg:max-w-md lg:flex-1"
            />

            <FilterBar>
              <FilterControl
                label="Category"
                value={categoryFilter}
                options={categoryOptions}
                onChange={(value) =>
                  setCategoryFilter(value as ComplaintCategory | 'all')
                }
              />

              <FilterControl
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={(value) =>
                  setStatusFilter(value as ComplaintStatus | 'all')
                }
              />

              <FilterControl
                label="Priority"
                value={priorityFilter}
                options={priorityOptions}
                onChange={(value) =>
                  setPriorityFilter(value as ComplaintPriority | 'all')
                }
              />
            </FilterBar>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" />}
            title={
              myComplaints.length === 0
                ? 'No complaints registered yet'
                : 'No complaints found'
            }
            description={
              myComplaints.length === 0
                ? 'You have not registered any complaints yet. Create your first complaint to get started.'
                : 'No complaints match your search and selected filters. Try changing your search or clearing the filters.'
            }
            action={
              myComplaints.length === 0 ? (
                <Link to="/complaints/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  Register a Complaint
                </Link>
              ) : hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-primary"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-ink-400"
              aria-live="polite"
            >
              <span>
                {filtered.length} complaint
                {filtered.length !== 1 ? 's' : ''} found
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-medium text-accent-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <ComplaintTable
              complaints={filtered}
              showPriority
              showEscalation
            />
          </>
        )}
      </div>
    </div>
  );
}
```
