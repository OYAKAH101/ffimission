import { useState } from 'react';
import crest from '../assets/logo.png';
import { SCHOOL } from '../utils/config';

// The school crest. The PNG has a white background, so it is shown on a white
// tile. If the image ever fails to load, a clearly labelled monogram appears instead.
export default function Logo({ className = 'size-14', tile = true }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${
        tile ? 'rounded-xl bg-white p-1' : ''
      } ${className}`}
    >
      {failed ? (
        <span
          role="img"
          aria-label={`${SCHOOL.name} logo placeholder`}
          className="flex size-full items-center justify-center rounded-lg bg-navy-800 font-display text-lg font-black text-white"
        >
          IN
        </span>
      ) : (
        <img
          src={crest}
          alt={`${SCHOOL.crestName} crest`}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      )}
    </span>
  );
}
