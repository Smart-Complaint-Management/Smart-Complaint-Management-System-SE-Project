import type {
  Complaint,
  ComplaintCategory,
} from '@/types';

/**
 * Information about a complaint that may be a duplicate.
 */
export interface DuplicateMatch {
  complaint: Complaint;
  similarity: number;
  reasons: string[];
}

/**
 * Input required to compare a new complaint.
 */
export interface DuplicateComplaintInput {
  subject: string;
  description: string;
  category: ComplaintCategory;
}

const DUPLICATE_THRESHOLD = 0.35;

/**
 * Normalize text before comparing complaints.
 */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert text into a set of meaningful words.
 */
function getWords(value: string): Set<string> {
  const ignoredWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'have',
    'has',
    'are',
    'was',
    'were',
    'not',
    'but',
    'can',
    'cannot',
    'unable',
    'into',
    'there',
    'their',
    'about',
    'please',
    'need',
    'help',
    'issue',
    'problem',
  ]);

  return new Set(
    normalizeText(value)
      .split(' ')
      .filter(
        (word) => word.length > 2 && !ignoredWords.has(word),
      ),
  );
}

/**
 * Calculate word overlap using the Jaccard similarity coefficient.
 */
function calculateSimilarity(
  first: string,
  second: string,
): number {
  const firstWords = getWords(first);
  const secondWords = getWords(second);

  if (firstWords.size === 0 || secondWords.size === 0) {
    return 0;
  }

  const intersection = [...firstWords].filter((word) =>
    secondWords.has(word),
  ).length;

  const union = new Set([
    ...firstWords,
    ...secondWords,
  ]).size;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Compare a new complaint against an existing complaint.
 */
function compareComplaints(
  input: DuplicateComplaintInput,
  existing: Complaint,
): DuplicateMatch | null {
  const subjectSimilarity = calculateSimilarity(
    input.subject,
    existing.subject,
  );

  const descriptionSimilarity = calculateSimilarity(
    input.description,
    existing.description,
  );

  const sameCategory = input.category === existing.category;

  const normalizedNewSubject = normalizeText(input.subject);
  const normalizedExistingSubject = normalizeText(existing.subject);

  const exactSubjectMatch =
    normalizedNewSubject.length > 0 &&
    normalizedNewSubject === normalizedExistingSubject;

  const categoryScore = sameCategory ? 0.1 : 0;

  const similarity =
    subjectSimilarity * 0.45 +
    descriptionSimilarity * 0.45 +
    categoryScore;

  const reasons: string[] = [];

  if (exactSubjectMatch) {
    reasons.push('The complaint subjects are identical.');
  } else if (subjectSimilarity >= 0.4) {
    reasons.push('The complaint subjects are similar.');
  }

  if (descriptionSimilarity >= 0.3) {
    reasons.push('The complaint descriptions contain similar information.');
  }

  if (sameCategory) {
    reasons.push('Both complaints belong to the same category.');
  }

  const isLikelyDuplicate =
    exactSubjectMatch ||
    similarity >= DUPLICATE_THRESHOLD;

  if (!isLikelyDuplicate) {
    return null;
  }

  return {
    complaint: existing,
    similarity: Math.min(similarity, 1),
    reasons,
  };
}

/**
 * Find possible duplicates for a newly submitted complaint.
 *
 * This function only identifies possible matches.
 * It does not merge, delete, or modify any complaint.
 */
export function findPotentialDuplicates(
  input: DuplicateComplaintInput,
  existingComplaints: Complaint[],
  excludeComplaintId?: string,
): DuplicateMatch[] {
  const normalizedSubject = normalizeText(input.subject);
  const normalizedDescription = normalizeText(input.description);

  if (!normalizedSubject && !normalizedDescription) {
    return [];
  }

  return existingComplaints
    .filter(
      (complaint) => complaint.id !== excludeComplaintId,
    )
    .map((complaint) =>
      compareComplaints(input, complaint),
    )
    .filter(
      (match): match is DuplicateMatch => match !== null,
    )
    .sort(
      (first, second) =>
        second.similarity - first.similarity,
    );
}

/**
 * Return whether a complaint has at least one possible duplicate.
 */
export function hasPotentialDuplicates(
  input: DuplicateComplaintInput,
  existingComplaints: Complaint[],
  excludeComplaintId?: string,
): boolean {
  return findPotentialDuplicates(
    input,
    existingComplaints,
    excludeComplaintId,
  ).length > 0;
}
