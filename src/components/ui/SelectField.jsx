import { CircleAlert } from 'lucide-react';

// Labelled drop-down that matches TextField. Pass <option> elements as children.
export default function SelectField({ id, label, error, hint, children, className = '', ...selectProps }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={[
          'h-12 w-full rounded-lg border bg-white px-3 text-base text-navy-900',
          'focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50 disabled:bg-navy-50 disabled:text-navy-500',
          error ? 'border-red-600' : 'border-navy-400',
        ].join(' ')}
        {...selectProps}
      >
        {children}
      </select>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-sm text-navy-600">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-red-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
