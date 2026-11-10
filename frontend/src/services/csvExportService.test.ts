import { describe, expect, it, vi } from 'vitest';
import {
  escapeCsvCell,
  buildCsvContent,
  triggerCsvDownload,
  COMPLAINT_CSV_COLUMNS,
} from './csvExportService';
import type { Complaint } from '@/types';

function createComplaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'CMP-2026-001',
    subject: 'Issue "A"',
    description: 'Line 1\nLine 2, with comma',
    category: 'facilities',
    status: 'submitted',
    priority: 'high',
    submittedBy: 'Alice',
    assignedTo: null,
    submittedAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isEscalated: false,
    possibleDuplicateId: null,
    ...overrides,
  };
}

describe('csvExportService', () => {
  describe('escapeCsvCell', () => {
    it('wraps values in quotes and escapes internal double quotes', () => {
      expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    });

    it('returns empty quotes for null or undefined values', () => {
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });

    it('neutralizes formula injection characters', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCsvCell('+12345')).toBe('"\'+12345"');
      expect(escapeCsvCell('-calc')).toBe('"\'-calc"');
      expect(escapeCsvCell('@command')).toBe('"\'@command"');
    });

    it('preserves commas and newlines inside quoted cells', () => {
      expect(escapeCsvCell('One, Two, Three')).toBe('"One, Two, Three"');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });
  });

  describe('buildCsvContent', () => {
    it('prepends UTF-8 BOM and produces valid CSV rows', () => {
      const complaints = [
        createComplaint({ id: 'CMP-1', subject: 'Subject 1' }),
        createComplaint({ id: 'CMP-2', subject: 'Subject 2', assignedTo: 'IT Support Desk' }),
      ];

      const csv = buildCsvContent(complaints, COMPLAINT_CSV_COLUMNS);

      expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
      expect(csv).toContain('"Complaint ID","Subject","Description"');
      expect(csv).toContain('"CMP-1","Subject 1"');
      expect(csv).toContain('"CMP-2","Subject 2"');
      expect(csv).toContain('"IT Support Desk"');
      expect(csv).toContain('"Unassigned"');
    });
  });

  describe('triggerCsvDownload', () => {
    it('creates a download link and revokes object URL in browser', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockReturnValue({
        set href(val: string) {},
        set download(val: string) {},
        click: clickMock,
      } as unknown as HTMLAnchorElement);

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      const result = triggerCsvDownload('test csv content', 'report.csv');
      expect(result).toBe(true);
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
