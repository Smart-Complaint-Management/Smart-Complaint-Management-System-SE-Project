import { useMemo, useState } from 'react';
import { FileSearch } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  FilterControl,
  FilterBar,
  type FilterOption,
} from '@/components/ui/FilterControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComplaintTable } from '@/components/ui/ComplaintTable';

import {
  categoryLabels,
  statusLabels,
  priorityLabels,
} from '@/data/mockData';

import { getComplaints } from '@/services/complaintService';
import type { Complaint } from '@/types';

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

const assignmentOptions: FilterOption[] = [
  { value: 'all', label: 'All Assignments' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
];

const duplicateOptions: FilterOption[] = [
  { value: 'all', label: 'All Complaints' },
  { value: 'yes', label: 'Possible Duplicates' },
  { value: 'no', label: 'No Possible Duplicate' },
];

export function AdminAllComplaintsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [duplicateFilter, setDuplicateFilter] = useState('all');

  const complaints: Complaint[] = getComplaints();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const fields = [
        complaint.id,
        complaint.subject,
        complaint.description,
        complaint.submittedBy,
        complaint.assignedTo ?? '',
        complaint.category,
        categoryLabels[complaint.category] ?? '',
        complaint.status,
        statusLabels[complaint.status] ?? '',
        complaint.priority,
        priorityLabels[complaint.priority] ?? '',
        complaint.possibleDuplicateId ?? '',
      ];

      const matchesSearch =
        query === '' ||
        fields.some((field) =>
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

      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' &&
          complaint.assignedTo !== null) ||
        (assignmentFilter === 'unassigned' &&
          complaint.assignedTo === null);

      const matchesDuplicate =
        duplicateFilter === 'all' ||
        (duplicateFilter === 'yes' &&
          complaint.possibleDuplicateId !== null) ||
        (duplicateFilter === 'no' &&
          complaint.possibleDuplicateId === null);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignment &&
        matchesDuplicate
      );
    });
  }, [
    complaints,
    search,
    categoryFilter,
    statusFilter,
    priorityFilter,
    assignmentFilter,
    duplicateFilter,
  ]);

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assignmentFilter !== 'all' ||
    duplicateFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssignmentFilter('all');
    setDuplicateFilter('all');
  }

  const duplicateCount = complaints.filter(
    (complaint) => complaint.possibleDuplicateId !== null,
  ).length;

  return (
    <div>
      <PageHeader
        title="All Complaints"
        description="Search, filter, and manage every complaint across the platform."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-sm text-ink-500">
            Total Complaints
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink-800">
            {complaints.length}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-sm text-ink-500">
            Complaints with Possible Duplicates
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {duplicateCount}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-ink-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by ID, subject, description, submitter, or assignee..."
              className="lg:max-w-md lg:flex-1"
            />

            <FilterBar>
              <FilterControl
                label="Category"
                value={categoryFilter}
                options={categoryOptions}
                onChange={setCategoryFilter}
              />

              <FilterControl
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />

              <FilterControl
                label="Priority"
                value={priorityFilter}
                options={priorityOptions}
                onChange={setPriorityFilter}
              />

              <FilterControl
                label="Assignment"
                value={assignmentFilter}
                options={assignmentOptions}
                onChange={setAssignmentFilter}
              />

              <FilterControl
                label="Duplicates"
                value={duplicateFilter}
                options={duplicateOptions}
                onChange={setDuplicateFilter}
              />
            </FilterBar>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" />}
            title="No complaints found"
            description={
              hasActiveFilters
                ? 'No complaints match your search and selected filters. Try changing your search or clearing the filters.'
                : 'There are currently no complaints to display.'
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-secondary"
                >
                  Clear filters
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
              showAssignedTo
              showEscalation
              showDuplicateInfo
            />
          </>
        )}
      </div>
    </div>
  );
}
