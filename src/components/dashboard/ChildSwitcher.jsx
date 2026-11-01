import { Avatar } from '../ui';

// Lets one parent account move between children. Each button reports its
// state with aria-pressed; the page announces the change in a live region.
export default function ChildSwitcher({ pupils, activeId, onChange }) {
  return (
    <div className="mb-5">
      <p id="child-switcher-label" className="mb-2 text-sm font-semibold text-navy-700">
        Your children ({pupils.length})
      </p>
      <div role="group" aria-labelledby="child-switcher-label" className="flex flex-wrap gap-2">
        {pupils.map((pupil) => {
          const active = pupil.id === activeId;
          return (
            <button
              key={pupil.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(pupil.id)}
              className={[
                'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600',
                active
                  ? 'border-navy-800 bg-navy-800 text-white shadow-sm'
                  : 'border-navy-200 bg-white text-navy-900 hover:border-navy-400 hover:bg-navy-50',
              ].join(' ')}
            >
              <Avatar name={pupil.name} className={active ? '!bg-white !text-navy-800' : ''} />
              <span>
                <span className="block text-sm font-bold leading-tight">{pupil.firstName}</span>
                <span className={`block text-xs ${active ? 'text-navy-100' : 'text-navy-700'}`}>
                  {pupil.className}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
