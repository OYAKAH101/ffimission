import { Megaphone } from 'lucide-react';
import { Badge, Card, CardHeader } from '../ui';
import { formatShortDate } from '../../utils/format';

// layout="list"  -> stacked rows, for narrow columns
// layout="grid"  -> items side by side, for full-width placement
export default function AnnouncementsCard({ items, layout = 'list', className = '' }) {
  const grid = layout === 'grid';
  return (
    <Card aria-labelledby="announcements-title" className={className}>
      <CardHeader id="announcements-title" icon={Megaphone} title="School announcements" />
      {items.length === 0 ? (
        <p className="p-5 text-sm text-navy-700">There are no announcements right now.</p>
      ) : (
        <ul className={grid ? 'grid gap-4 p-5 md:grid-cols-3' : 'divide-y divide-navy-100'}>
          {items.map((item) => (
            <li
              key={item.id}
              className={grid ? 'rounded-lg border border-navy-100 bg-navy-50/50 p-4' : 'px-5 py-4'}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone="brand">{item.audience}</Badge>
                <time dateTime={item.postedAt.toISOString()} className="text-xs text-navy-600">
                  {formatShortDate(item.postedAt)}
                </time>
              </div>
              <h3 className="mt-2 text-sm font-bold text-navy-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-navy-700">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
