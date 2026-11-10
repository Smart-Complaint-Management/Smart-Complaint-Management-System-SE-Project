import type { Complaint } from '@/types';
import { categoryLabels, statusLabels } from '@/data/mockData';

export interface CsvColumn<T> {
  label: string;
  getValue: (item: T) => string | number | boolean | null | undefined;
}

/**
 * Escapes a cell value conforming to RFC 4180 standards.
 * Also defends against CSV / Spreadsheet formula injection vulnerabilities
 * by prefixing risky leading characters (=, +, -, @) with a single quote.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let text = String(value);

  // Formula injection defense for spreadsheet applications
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  // Double quotes must be escaped with two double quotes
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Complaint CSV column specifications.
 */
export const COMPLAINT_CSV_COLUMNS: CsvColumn<Complaint>[] = [
  { label: 'Complaint ID', getValue: (c) => c.id },
  { label: 'Subject', getValue: (c) => c.subject },
  { label: 'Description', getValue: (c) => c.description },
  {
    label: 'Category',
    getValue: (c) => categoryLabels[c.category] || c.category || 'Other',
  },
  {
    label: 'Status',
    getValue: (c) => statusLabels[c.status] || c.status,
  },
  { label: 'Priority', getValue: (c) => c.priority },
  { label: 'Submitted By', getValue: (c) => c.submittedBy },
  { label: 'Assigned Department', getValue: (c) => c.assignedTo || 'Unassigned' },
  { label: 'Submitted At', getValue: (c) => c.submittedAt },
  { label: 'Updated At', getValue: (c) => c.updatedAt },
  { label: 'Escalated', getValue: (c) => (c.isEscalated ? 'Yes' : 'No') },
  {
    label: 'Duplicate Reference ID',
    getValue: (c) => c.possibleDuplicateId || 'None',
  },
];

/**
 * Build CSV string from a dataset and column definitions.
 * Prepends UTF-8 BOM (\uFEFF) for compatibility with Microsoft Excel.
 */
export function buildCsvContent<T>(
  data: T[],
  columns: CsvColumn<T>[]
): string {
  const headerRow = columns.map((col) => escapeCsvCell(col.label)).join(',');
  const dataRows = data.map((item) =>
    columns.map((col) => escapeCsvCell(col.getValue(item))).join(',')
  );

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function triggerCsvDownload(
  content: string,
  filename = `complaint-reports-${new Date().toISOString().slice(0, 10)}.csv`
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to trigger CSV download:', error);
    return false;
  }
}
