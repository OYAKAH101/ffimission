import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

const tones = {
  info: { box: 'border-marian-200 bg-marian-50 text-navy-900', icon: Info, iconClass: 'text-marian-600' },
  success: { box: 'border-emerald-300 bg-emerald-50 text-emerald-950', icon: CircleCheck, iconClass: 'text-emerald-700' },
  error: { box: 'border-red-300 bg-red-50 text-red-950', icon: CircleAlert, iconClass: 'text-red-700' },
  warning: { box: 'border-amber-300 bg-amber-50 text-amber-950', icon: TriangleAlert, iconClass: 'text-amber-700' },
};

// Errors use role="alert" (announced immediately); other tones use role="status".
export default function Alert({ tone = 'info', title, children, className = '' }) {
  const { box, icon: Icon, iconClass } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-lg border p-3.5 text-sm leading-relaxed ${box} ${className}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${iconClass}`} />
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}
