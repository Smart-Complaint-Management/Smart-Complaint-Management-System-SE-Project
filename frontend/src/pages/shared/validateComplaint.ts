import type { ComplaintCategory, ComplaintPriority } from '@/types';
import { categoryLabels } from '@/data/mockData';

export interface ComplaintFormValues {
  subject: string;
  category: ComplaintCategory | '';
  priority: ComplaintPriority;
  description: string;
}

export type ComplaintFormErrors = Partial<Record<'subject' | 'category' | 'description', string>>;

export const SUBJECT_MIN = 5;
export const SUBJECT_MAX = 120;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;

export function validateComplaint(values: ComplaintFormValues): ComplaintFormErrors {
  const errors: ComplaintFormErrors = {};
  const subject = values.subject.trim();
  const description = values.description.trim();

  if (!subject) {
    errors.subject = 'Subject is required.';
  } else if (subject.length < SUBJECT_MIN) {
    errors.subject = `Subject must be at least ${SUBJECT_MIN} characters.`;
  } else if (subject.length > SUBJECT_MAX) {
    errors.subject = `Subject must be ${SUBJECT_MAX} characters or fewer.`;
  }

  if (!values.category || !(values.category in categoryLabels)) {
    errors.category = 'Please select a category.';
  }

  if (!description) {
    errors.description = 'Description is required.';
  } else if (description.length < DESCRIPTION_MIN) {
    errors.description = `Please describe the issue in at least ${DESCRIPTION_MIN} characters.`;
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  return errors;
}