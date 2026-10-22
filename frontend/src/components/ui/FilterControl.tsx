import type { ReactNode } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterControlProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterControl({ label, value, options, onChange }: FilterControlProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-ink-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input min-w-[8rem] cursor-pointer pr-8"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}
