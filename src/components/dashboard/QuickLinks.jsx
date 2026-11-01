import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../ui';

// Big tappable shortcuts. `items` come from config/navigation.js.
export default function QuickLinks({ items, label = 'Quick navigation' }) {
  return (
    <nav aria-label={label}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(({ to, label: itemLabel, icon: Icon, description, ready }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full flex-col rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition-colors hover:border-navy-300 hover:bg-navy-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600"
            >
              <span className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy-800 text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {ready === false || ready === undefined ? <Badge>Soon</Badge> : null}
              </span>
              <span className="mt-3 flex items-center gap-1 font-display text-base font-bold text-navy-900">
                {itemLabel}
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-navy-500 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </span>
              <span className="mt-1 text-sm leading-snug text-navy-700">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
