import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Card, CardHeader } from '../ui';

const QUIET_PERIODS = new Set(['Assembly', 'Break']);

// Day tabs follow the standard tab pattern: arrow keys move between days,
// Home/End jump to the first/last, and only the selected tab is in the tab order.
export default function TimetableCard({ timetable, idPrefix = 'tt' }) {
  const days = Object.keys(timetable);
  const todayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());
  const [selected, setSelected] = useState(days.includes(todayName) ? todayName : days[0]);
  const tabRefs = useRef({});

  const move = (event, index) => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: days.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = days[(keys[event.key] + days.length) % days.length];
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Card aria-labelledby={`${idPrefix}-title`}>
      <CardHeader
        id={`${idPrefix}-title`}
        icon={CalendarDays}
        title="Timetable"
        description={selected === todayName ? 'Today’s lessons' : `${selected}’s lessons`}
      />
      <div className="p-5">
        <div role="tablist" aria-label="Day of the week" className="flex gap-1 rounded-lg bg-navy-50 p-1">
          {days.map((day, index) => {
            const active = day === selected;
            return (
              <button
                key={day}
                ref={(node) => {
                  tabRefs.current[day] = node;
                }}
                id={`${idPrefix}-tab-${day}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`${idPrefix}-panel`}
                aria-label={day === todayName ? `${day} (today)` : day}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(day)}
                onKeyDown={(event) => move(event, index)}
                className={[
                  'flex-1 rounded-md px-2 py-2 text-sm font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-marian-600',
                  active ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-700 hover:bg-white/60',
                ].join(' ')}
              >
                <span aria-hidden="true">{day.slice(0, 3)}</span>
                {day === todayName && (
                  <span aria-hidden="true" className="mx-auto mt-1 block size-1.5 rounded-full bg-blush-500" />
                )}
              </button>
            );
          })}
        </div>

        <div
          id={`${idPrefix}-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-tab-${selected}`}
          tabIndex={0}
          className="mt-4 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600"
        >
          {timetable[selected].length === 0 && (
            <p className="py-3 text-sm text-navy-700">No lessons have been added for {selected}.</p>
          )}
          <ol className="divide-y divide-navy-100">
            {timetable[selected].map((period) => (
              <li key={`${period.time}-${period.subject}`} className="flex items-center gap-4 py-2.5 text-sm">
                <span className="w-12 shrink-0 font-semibold tabular-nums text-navy-700">{period.time}</span>
                <span className={QUIET_PERIODS.has(period.subject) ? 'text-navy-600' : 'font-semibold text-navy-900'}>
                  {period.subject}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}
