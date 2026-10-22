import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileSearch, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterControl, FilterBar, type FilterOption } from '@/components/ui/FilterControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComplaintTable } from '@/components/ui/ComplaintTable';
import { useRole } from '@/context/RoleContext';
import { mockComplaints, categoryLabels, statusLabels } from '@/data/mockData';
import type { ComplaintCategory, ComplaintStatus } from '@/types';

const categoryOptions: FilterOption[] = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
];

const statusOptions: FilterOption[] = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];

export function UserComplaintsPage() {
  const { user } = useRole();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const myComplaints = useMemo(
    () => mockComplaints.filter((c) => c.submittedBy === user.name),
    [user.name],
  );

  const filtered = useMemo(() => {
    return myComplaints.filter((c) => {
      const matchesSearch =
        search === '' ||
        c.subject.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [myComplaints, search, categoryFilter, statusFilter]);

  return (
    <div>
      <PageHeader
        title="My Complaints"
        description="Search and filter through all complaints you have registered."
        actions={
          <Link to="/complaints/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New Complaint
          </Link>
        }
      />

      <div className="card">
        {/* Filters */}
        <div className="border-b border-ink-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by subject, ID, or description..."
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
            </FilterBar>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-6 w-6" />}
            title="No complaints found"
            description="Try adjusting your search or filters. If you haven't registered any complaints yet, you can create one now."
            action={
              <Link to="/complaints/new" className="btn btn-primary">
                <Plus className="h-4 w-4" /> Register a Complaint
              </Link>
            }
          />
        ) : (
          <>
            <div className="px-5 py-3 text-xs text-ink-400">
              {filtered.length} complaint{filtered.length !== 1 ? 's' : ''} found
            </div>
            <ComplaintTable complaints={filtered} showEscalation />
          </>
        )}
      </div>
    </div>
  );
}
