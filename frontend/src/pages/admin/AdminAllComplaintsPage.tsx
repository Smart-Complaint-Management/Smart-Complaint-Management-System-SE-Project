import { useMemo, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterControl, FilterBar, type FilterOption } from '@/components/ui/FilterControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { mockComplaints, categoryLabels, statusLabels, priorityLabels } from '@/data/mockData';

const categoryOptions: FilterOption[] = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
];

const statusOptions: FilterOption[] = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];

const priorityOptions: FilterOption[] = [
  { value: 'all', label: 'All Priorities' },
  ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label })),
];

const assignmentOptions: FilterOption[] = [
  { value: 'all', label: 'All Assignments' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
];

export function AdminAllComplaintsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  const filtered = useMemo(() => {
    return mockComplaints.filter((c) => {
      const matchesSearch =
        search === '' ||
        c.subject.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.submittedBy.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && c.assignedTo !== null) ||
        (assignmentFilter === 'unassigned' && c.assignedTo === null);
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesAssignment;
    });
  }, [search, categoryFilter, statusFilter, priorityFilter, assignmentFilter]);

  return (
    <div>
      <PageHeader
        title="All Complaints"
        description="Search, filter, and manage every complaint across the platform."
      />

      <div className="card">
        {/* Filters */}
        <div className="border-b border-ink-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by subject, ID, or submitter..."
              className="lg:max-w-md lg:flex-1"
            />
            <FilterBar>
              <FilterControl label="Category" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
              <FilterControl label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
              <FilterControl label="Priority" value={priorityFilter} options={priorityOptions} onChange={setPriorityFilter} />
              <FilterControl label="Assignment" value={assignmentFilter} options={assignmentOptions} onChange={setAssignmentFilter} />
            </FilterBar>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" />}
            title="No complaints found"
            description="Try adjusting your search or filters to find what you are looking for."
          />
        ) : (
          <>
            <div className="px-5 py-3 text-xs text-ink-400">
              {filtered.length} complaint{filtered.length !== 1 ? 's' : ''} found
            </div>
            <ComplaintTable complaints={filtered} showPriority showAssignedTo showEscalation />
          </>
        )}
      </div>
    </div>
  );
}
