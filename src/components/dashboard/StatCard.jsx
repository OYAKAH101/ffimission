import { Card } from '../ui';

export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card as="div" className="p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-marian-50 text-marian-700">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-700">{label}</p>
          <p className="font-display text-3xl font-black leading-tight text-navy-900">{value}</p>
          {hint && <p className="text-sm text-navy-600">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}
