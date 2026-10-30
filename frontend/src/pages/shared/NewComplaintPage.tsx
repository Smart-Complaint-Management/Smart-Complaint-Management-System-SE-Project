import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { categoryLabels } from '@/data/mockData';
import { useAuth } from '@/pages/auth/authContext';
import { createComplaint } from '@/services/complaintService';
import {
  DESCRIPTION_MAX,
  SUBJECT_MAX,
  validateComplaint,
} from './validateComplaint';

import type {
  ComplaintFormErrors,
  ComplaintFormValues,
} from './validateComplaint';
import type { ComplaintCategory, ComplaintPriority } from '@/types';

const categoryOptions = Object.entries(categoryLabels) as [
  ComplaintCategory,
  string,
][];

const priorityOptions: {
  value: ComplaintPriority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

/**
 * Rule-based priority classification.
 *
 * Critical: immediate safety risks or serious threats.
 * High: urgent incidents requiring prompt attention.
 * Medium: issues that affect normal activities.
 * Low: minor issues or general requests.
 *
 * This is a transparent heuristic, not a trained ML model.
 */
export function classifyComplaintPriority(
  subject: string,
  description: string,
  category: ComplaintCategory | '',
): ComplaintPriority {
  const text = `${subject} ${description}`.toLowerCase();

  const criticalKeywords = [
    'fire',
    'explosion',
    'life threatening',
    'life-threatening',
    'suicide',
    'sexual assault',
    'physical assault',
    'weapon',
    'severe injury',
    'emergency',
    'immediate danger',
  ];

  const highKeywords = [
    'urgent',
    'unsafe',
    'security breach',
    'harassment',
    'threat',
    'water leakage',
    'power outage',
    'server down',
    'network down',
    'exam tomorrow',
    'cannot access',
    'cannot use',
  ];

  const lowKeywords = [
    'suggestion',
    'minor',
    'cosmetic',
    'improvement',
    'feedback',
    'request for information',
  ];

  if (criticalKeywords.some((keyword) => text.includes(keyword))) {
    return 'critical';
  }

  if (
    category === 'harassment' ||
    highKeywords.some((keyword) => text.includes(keyword))
  ) {
    return 'high';
  }

  if (lowKeywords.some((keyword) => text.includes(keyword))) {
    return 'low';
  }

  return 'medium';
}

const EMPTY_FORM: ComplaintFormValues = {
  subject: '',
  category: '',
  priority: 'medium',
  description: '',
};

export function NewComplaintPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [form, setForm] = useState<ComplaintFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ComplaintFormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const suggestedPriority = useMemo(
    () =>
      classifyComplaintPriority(
        form.subject,
        form.description,
        form.category,
      ),
    [form.subject, form.description, form.category],
  );

  const clearError = (field: keyof ComplaintFormErrors) => {
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!session) {
      setSubmitError(
        'Please sign in again before submitting a complaint.',
      );
      return;
    }

    const validationErrors = validateComplaint(form);
    setErrors(validationErrors);

    if (
      Object.keys(validationErrors).length > 0 ||
      form.category === ''
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const created = await createComplaint({
        subject: form.subject,
        category: form.category,
        priority: suggestedPriority,
        description: form.description,
        submittedBy: session.fullName,
      });

      setCreatedId(created.id);
    } catch {
      setSubmitError(
        'Could not submit your complaint. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `input mt-1.5 ${hasError ? 'border-rose-400' : ''}`;

  if (createdId) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/complaints')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Complaints
        </button>

        <div role="status" className="card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-ink-900">
            Complaint Registered
          </h2>

          <p className="mt-2 text-sm text-ink-500">
            Your tracking ID is{' '}
            <span className="font-mono font-medium text-ink-800">
              {createdId}
            </span>
            . Your complaint has been registered with{' '}
            <strong>
              {priorityOptions.find(
                (option) => option.value === suggestedPriority,
              )?.label ?? 'Medium'}
            </strong>{' '}
            priority.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/complaints/${createdId}`)}
              className="btn btn-primary"
            >
              View Complaint
            </button>

            <button
              type="button"
              onClick={() => navigate('/complaints')}
              className="btn btn-secondary"
            >
              My Complaints
            </button>

            <button
              type="button"
              onClick={() => {
                setCreatedId(null);
                setForm(EMPTY_FORM);
                setErrors({});
                setSubmitError('');
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
        type="button"
        onClick={() => navigate('/complaints')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Complaints
      </button>

      <PageHeader
        title="Register a New Complaint"
        description="Provide the details below. Fields marked with * are required."
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="card mx-auto max-w-2xl p-6"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-ink-700"
            >
              Subject <span className="text-rose-500">*</span>
            </label>

            <input
              id="subject"
              type="text"
              value={form.subject}
              onChange={(event) => {
                setForm({
                  ...form,
                  subject: event.target.value,
                });
                clearError('subject');
              }}
              maxLength={SUBJECT_MAX + 20}
              placeholder="Brief title describing your complaint"
              className={inputClass(!!errors.subject)}
              aria-invalid={errors.subject ? true : undefined}
              aria-describedby={
                errors.subject ? 'subject-error' : undefined
              }
            />

            {errors.subject && (
              <p
                id="subject-error"
                className="mt-1 text-sm text-rose-600"
              >
                {errors.subject}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-ink-700"
            >
              Category <span className="text-rose-500">*</span>
            </label>

            <select
              id="category"
              value={form.category}
              onChange={(event) => {
                setForm({
                  ...form,
                  category: event.target.value as
                    | ComplaintCategory
                    | '',
                });
                clearError('category');
              }}
              className={`${inputClass(!!errors.category)} cursor-pointer`}
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={
                errors.category ? 'category-error' : undefined
              }
            >
              <option value="">Select a category</option>

              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {errors.category && (
              <p
                id="category-error"
                className="mt-1 text-sm text-rose-600"
              >
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-600" />

              <span className="text-sm font-medium text-ink-700">
                Automatically Suggested Priority
              </span>
            </div>

            <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-ink-500">
                  Based on the complaint details
                </span>

                <span
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 text-sm font-semibold capitalize text-ink-800"
                  aria-live="polite"
                >
                  {suggestedPriority}
                </span>
              </div>

              <p className="mt-2 text-xs text-ink-400">
                Priority is suggested automatically using predefined
                rules. Review the details carefully; serious or
                emergency situations may require immediate human
                attention.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-ink-700"
            >
              Description <span className="text-rose-500">*</span>
            </label>

            <textarea
              id="description"
              value={form.description}
              onChange={(event) => {
                setForm({
                  ...form,
                  description: event.target.value,
                });
                clearError('description');
              }}
              maxLength={DESCRIPTION_MAX}
              placeholder="Describe the issue in detail. Include dates, locations, and any relevant context."
              className={`${inputClass(!!errors.description)} min-h-[140px] resize-y`}
              rows={6}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={
                errors.description
                  ? 'description-error'
                  : undefined
              }
            />

            <div className="mt-1 flex items-start justify-between gap-3">
              {errors.description ? (
                <p
                  id="description-error"
                  className="text-sm text-rose-600"
                >
                  {errors.description}
                </p>
              ) : (
                <span />
              )}

              <span className="shrink-0 text-xs text-ink-400">
                {form.description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {submitError}
            </p>
          )}

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-400">
            This demo currently stores complaints in shared in-memory
            data. Persistent storage across page refreshes requires
            browser storage or a backend.
          </p>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={() => navigate('/complaints')}
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
