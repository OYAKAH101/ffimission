import { Wallet } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader, ProgressBar } from '../ui';
import { feeSummary } from '../../utils/pupilStats';
import { formatDate, formatNaira } from '../../utils/format';

const STATUS_TONE = { 'Paid in full': 'success', 'Part paid': 'warning', Unpaid: 'danger', 'No fees set': 'neutral' };

export default function FeesCard({ fees }) {
  const summary = feeSummary(fees);

  return (
    <Card aria-labelledby="fees-title">
      <CardHeader
        id="fees-title"
        icon={Wallet}
        title="School fees"
        action={<Badge tone={STATUS_TONE[summary.status]}>{summary.status}</Badge>}
      />
      <CardBody>
        <dl className="space-y-2 text-sm">
          {fees.items.map((item) => (
            <div key={item.label} className="flex justify-between gap-3">
              <dt className="text-navy-700">{item.label}</dt>
              <dd className="tabular-nums text-navy-900">{formatNaira(item.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-navy-100 pt-2 font-bold">
            <dt className="text-navy-900">Total</dt>
            <dd className="tabular-nums text-navy-900">{formatNaira(summary.total)}</dd>
          </div>
        </dl>

        <ProgressBar
          value={summary.total > 0 ? Math.min(100, (summary.paid / summary.total) * 100) : 0}
          label="Share of fees paid"
          tone={summary.balance === 0 ? 'success' : 'brand'}
          className="mt-4"
        />
        <div className="mt-3 flex justify-between gap-3 text-sm">
          <p>
            <span className="text-navy-700">Paid </span>
            <span className="font-bold tabular-nums text-navy-900">{formatNaira(summary.paid)}</span>
          </p>
          <p>
            <span className="text-navy-700">Balance </span>
            <span className="font-bold tabular-nums text-navy-900">{formatNaira(summary.balance)}</span>
          </p>
        </div>
        {summary.total === 0 && <p className="mt-3 text-sm text-navy-700">No fees have been set for this term yet.</p>}
        {summary.balance > 0 && fees.dueDate && (
          <p className="mt-3 text-sm text-navy-700">Balance due by {formatDate(fees.dueDate)}.</p>
        )}
        <p className="mt-3 text-xs text-navy-600">
          Payments are recorded by the school office. Online payment is not available yet.
        </p>
      </CardBody>
    </Card>
  );
}
