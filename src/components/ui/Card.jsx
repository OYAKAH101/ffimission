// Surface used for every dashboard section. `as` lets a card be a <section>
// with a heading, which gives screen readers a landmark to jump to.
export default function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`min-w-0 rounded-xl border border-navy-100 bg-white shadow-sm ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ id, title, description, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-marian-50 text-marian-700">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={id} className="font-display text-base font-bold leading-snug text-navy-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-navy-600">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
