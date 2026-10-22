import type { LucideIcon } from 'lucide-react';

interface SummaryMetricProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: 'default' | 'success' | 'warning' | 'danger';
}

const accentStyles: Record<NonNullable<SummaryMetricProps['accent']>, string> = {
  default: 'text-accent-600 bg-accent-50',
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  danger: 'text-rose-600 bg-rose-50',
};

export function SummaryMetric({ label, value, icon: Icon, hint, accent = 'default' }: SummaryMetricProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
