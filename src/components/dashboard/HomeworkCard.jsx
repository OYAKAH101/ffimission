import { NotebookPen } from 'lucide-react';
import { Badge, Card, CardHeader } from '../ui';
import { daysUntil, dueLabel } from '../../utils/format';

function status(item) {
  if (item.done) return { tone: 'success', label: 'Handed in' };
  const days = daysUntil(item.due);
  if (days < 0) return { tone: 'danger', label: dueLabel(item.due) };
  if (days <= 1) return { tone: 'warning', label: dueLabel(item.due) };
  return { tone: 'info', label: dueLabel(item.due) };
}

export default function HomeworkCard({ items }) {
  // Work still to do comes first, soonest due date at the top.
  const sorted = [...items].sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.due - b.due);

  return (
    <Card aria-labelledby="homework-title">
      <CardHeader id="homework-title" icon={NotebookPen} title="Homework" />
      {sorted.length === 0 ? (
        <p className="p-5 text-sm text-navy-700">No homework has been set.</p>
      ) : (
        <ul className="divide-y divide-navy-100">
          {sorted.map((item) => {
            const { tone, label } = status(item);
            return (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-navy-900">{item.title}</p>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <p className="mt-1 text-sm text-navy-700">{item.subject}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
