import { useState } from 'react';
import { Card } from '../ui';
import { pupilPhotoUrl } from '../../services/dataService';

// The pupil's photograph, served by the API only to people allowed to see this pupil.
// Falls back to initials when there is no photograph (or it cannot be loaded).
export function PupilPhoto({ pupil, className = 'size-28', version }) {
  const [failed, setFailed] = useState(false);

  if (pupil.hasPhoto && !failed) {
    return (
      <img
        src={pupilPhotoUrl(pupil.id, version)}
        alt={`Photograph of ${pupil.name}`}
        onError={() => setFailed(true)}
        key={version}
        className={`shrink-0 rounded-2xl border border-navy-100 bg-navy-50 object-cover ${className}`}
      />
    );
  }

  const letters = pupil.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (
    <div
      role="img"
      aria-label={`No photograph for ${pupil.name}`}
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-marian-50 text-navy-800 ${className}`}
    >
      <span aria-hidden="true" className="font-display text-3xl font-black">
        {letters}
      </span>
    </div>
  );
}

// `stats` = [{ label, value }], shown in a strip under the details.
export default function PupilProfileCard({ pupil, stats = [] }) {
  const details = [
    ['Admission number', pupil.admissionNo],
    ['Class', pupil.className],
    ['Academic session', [pupil.session, pupil.term].filter(Boolean).join(', ')],
    ['Class teacher', pupil.classTeacher],
  ];

  return (
    <Card aria-label={`Profile of ${pupil.name}`} className="overflow-hidden border-l-4 border-l-blush-300">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <PupilPhoto pupil={pupil} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-black leading-tight text-navy-900">{pupil.name}</h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm min-[480px]:grid-cols-2">
            {details.map(([term, value]) => (
              <div key={term}>
                <dt className="text-navy-600">{term}</dt>
                <dd className="font-semibold text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {stats.length > 0 && (
        <dl className="grid grid-cols-3 divide-x divide-navy-100 border-t border-navy-100 bg-navy-50/60">
          {stats.map(({ label, value }) => (
            <div key={label} className="px-3 py-3.5 text-center sm:px-5">
              <dt className="text-xs text-navy-700 sm:text-sm">{label}</dt>
              <dd className="mt-0.5 font-display text-lg font-black text-navy-900 sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
