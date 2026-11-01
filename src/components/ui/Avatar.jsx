import { initials } from '../../utils/format';

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

// Initials avatar. Used for staff, parents and as the pupil photo placeholder
// until real photographs are uploaded (which needs the backend and consent).
export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-marian-100 font-bold text-navy-800 ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
