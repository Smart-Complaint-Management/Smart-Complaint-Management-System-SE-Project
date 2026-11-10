import { describe, it, expect } from 'vitest';
import { validateComplaint } from '../pages/shared/validateComplaint';
import type { ComplaintFormValues } from '../pages/shared/validateComplaint';

const validForm: ComplaintFormValues = {
  subject: 'Network issue',
  category: 'it_infrastructure',
  priority: 'medium',
  description: 'Unable to access the campus network connection.',
};

describe('validateComplaint category validation', () => {
  it('accepts a valid predefined category', () => {
    const errors = validateComplaint(validForm);

    expect(errors.category).toBeUndefined();
  });

  it('rejects an empty category', () => {
    const errors = validateComplaint({
      ...validForm,
      category: '',
    });

    expect(errors.category).toBe('Please select a category.');
  });

  it('rejects a category that is not in the predefined list', () => {
    const errors = validateComplaint({
      ...validForm,
      category: 'invalid_category' as ComplaintFormValues['category'],
    });

    expect(errors.category).toBe('Please select a category.');
  });

  it('accepts every predefined category', () => {
    const categories = [
      'facilities',
      'it_infrastructure',
      'academic',
      'administrative',
      'harassment',
      'other',
    ] as const;

    categories.forEach((category) => {
      const errors = validateComplaint({
        ...validForm,
        category,
      });

      expect(errors.category).toBeUndefined();
    });
  });
});
