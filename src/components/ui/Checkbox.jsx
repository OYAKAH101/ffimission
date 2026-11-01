export default function Checkbox({ id, label, className = '', ...props }) {
  return (
    <label htmlFor={id} className={`inline-flex cursor-pointer items-center gap-2.5 text-sm text-navy-800 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="size-5 shrink-0 rounded border-navy-400 accent-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600"
        {...props}
      />
      {label}
    </label>
  );
}
