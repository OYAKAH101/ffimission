import { CircleAlert } from 'lucide-react';

// Labelled text input with an optional leading icon, a trailing slot (used by the
// password toggle), a hint and an error message. Error text is linked to the
// input with aria-describedby so screen readers announce it with the field.
export default function TextField({
  id,
  label,
  error,
  hint,
  icon: Icon,
  trailing,
  className = '',
  ref,
  ...inputProps
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-navy-500"
          />
        )}
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'h-12 w-full rounded-lg border bg-white text-base text-navy-900 placeholder:text-navy-500',
            'focus:border-navy-700 focus:outline-2 focus:outline-marian-500/50',
            'disabled:bg-navy-50 disabled:text-navy-500',
            Icon ? 'pl-11' : 'pl-3.5',
            trailing ? 'pr-12' : 'pr-3.5',
            error ? 'border-red-600' : 'border-navy-400',
          ].join(' ')}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-navy-600">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-red-700"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
