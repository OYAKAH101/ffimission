import { History } from 'lucide-react';
import { Card, CardHeader } from '../ui';
import { timeAgo } from '../../utils/format';

export default function ActivityCard({ items }) {
  return (
    <Card aria-labelledby="activity-title">
      <CardHeader id="activity-title" icon={History} title="Recent activity" />
      {items.length === 0 && <p className="p-5 text-sm text-navy-700">Nothing has happened yet.</p>}
      <ol className="divide-y divide-navy-100">
        {items.map((item) => (
          <li key={item.id} className="px-5 py-3.5">
            <p className="text-sm leading-relaxed text-navy-900">{item.text}</p>
            <time dateTime={item.at.toISOString()} className="mt-0.5 block text-xs text-navy-600">
              {timeAgo(item.at)}
            </time>
          </li>
        ))}
      </ol>
    </Card>
  );
}
