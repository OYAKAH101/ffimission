// Tones are all AA-contrast on their own background.
const tones = {
  neutral: 'bg-navy-50 text-navy-700',
  info: 'bg-marian-100 text-marian-700',
  success: 'bg-emerald-100 text-emerald-900',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-900',
  brand: 'bg-blush-100 text-blush-700',
};

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
