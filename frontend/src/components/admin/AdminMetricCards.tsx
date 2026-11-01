import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SummaryMetric } from '@/components/ui/SummaryMetric';

export interface AdminMetricCardsProps {
  total: number;
  open: number;
  resolved: number;
  escalated: number;
}

export function AdminMetricCards({
  total,
  open,
  resolved,
  escalated,
}: AdminMetricCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryMetric
        label="Total Complaints"
        value={total}
        icon={FileText}
        hint="All registered complaints."
      />

      <SummaryMetric
        label="Open"
        value={open}
        icon={Clock}
        accent="warning"
        hint="Awaiting triage or resolution."
      />

      <SummaryMetric
        label="Resolved"
        value={resolved}
        icon={CheckCircle2}
        accent="success"
        hint="Successfully resolved."
      />

      <SummaryMetric
        label="Escalated"
        value={escalated}
        icon={AlertTriangle}
        accent="danger"
        hint="Require administrative review."
      />
    </div>
  );
}
