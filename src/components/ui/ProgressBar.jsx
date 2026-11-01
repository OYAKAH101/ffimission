const fills = {
  navy: 'bg-navy-700',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  brand: 'bg-blush-500',
};

export default function ProgressBar({ value, label, tone = 'navy', className = '' }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={`h-2 w-full overflow-hidden rounded-full bg-navy-100 ${className}`}
    >
      <div className={`h-full rounded-full ${fills[tone]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
