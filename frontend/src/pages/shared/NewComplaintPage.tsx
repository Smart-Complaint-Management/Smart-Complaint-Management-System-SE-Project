import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { categoryLabels } from '@/data/mockData';
import type { ComplaintCategory, ComplaintPriority } from '@/types';

const categoryOptions = Object.entries(categoryLabels) as [ComplaintCategory, string][];

const priorityOptions: { value: ComplaintPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function NewComplaintPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    category: 'facilities' as ComplaintCategory,
    priority: 'medium' as ComplaintPriority,
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo interaction only — no backend persistence.
    setSubmitted(true);
  };

  const isFormValid = form.subject.trim() !== '' && form.description.trim() !== '';

  if (submitted) {
    return (
      <div>
        <button
          onClick={() => navigate('/complaints')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Complaints
        </button>
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink-900">Complaint Registered</h2>
          <p className="mt-2 text-sm text-ink-500">
            Your complaint has been submitted (demo only). In the live system, you would receive a
            tracking ID and confirmation via email.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => navigate('/complaints')} className="btn btn-primary">
              View My Complaints
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ subject: '', category: 'facilities', priority: 'medium', description: '' });
              }}
              className="btn btn-secondary"
            >
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/complaints')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Complaints
      </button>

      <PageHeader
        title="Register a New Complaint"
        description="Provide the details below. Fields marked with * are required."
      />

      <form onSubmit={handleSubmit} className="card mx-auto max-w-2xl p-6">
        <div className="space-y-5">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-ink-700">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief title describing your complaint"
              className="input mt-1.5"
              required
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-ink-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ComplaintCategory })}
                className="input mt-1.5 cursor-pointer"
              >
                {categoryOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-ink-700">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as ComplaintPriority })}
                className="input mt-1.5 cursor-pointer"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-ink-700">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the issue in detail. Include dates, locations, and any relevant context."
              className="input mt-1.5 min-h-[140px] resize-y"
              rows={6}
              required
            />
          </div>

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-400">
            This is a demo form. Complaints are not submitted to a server. The final version will
            send this data to the Flask backend.
          </p>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button type="button" onClick={() => navigate('/complaints')} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isFormValid}>
              <Send className="h-4 w-4" /> Submit Complaint
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
