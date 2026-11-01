import Spinner from './Spinner';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-navy-800 text-white hover:bg-navy-900',
  secondary: 'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-50',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

// <Button>                      -> a <button>
// <Button as={Link} to="/x">    -> a router link that looks like a button
// loading disables the button and swaps the icon for a spinner.
export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  ...props
}) {
  const isButton = Tag === 'button';
  return (
    <Tag
      {...(isButton ? { type: props.type ?? 'button', disabled: loading || props.disabled } : {})}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : Icon ? <Icon aria-hidden="true" className="size-5" /> : null}
      {children}
    </Tag>
  );
}
