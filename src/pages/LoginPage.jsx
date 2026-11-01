import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CircleCheck, LogIn, User } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { Alert, Button, Checkbox, PasswordField, TextField } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { homePathForRole } from '../utils/roles';
import { validateLogin } from '../utils/validators';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ identifier: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  // "idle" -> "submitting" -> "success". Staying out of "idle" on success keeps
  // the redirect below from skipping the success message.
  const [phase, setPhase] = useState('idle');

  const identifierRef = useRef(null);
  const passwordRef = useRef(null);

  // Someone who is already signed in has no reason to see this page.
  if (status === 'authenticated' && phase === 'idle') {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  const busy = phase !== 'idle';

  const update = (field) => (event) => {
    const value = field === 'remember' ? event.target.checked : event.target.value;
    const next = { ...form, [field]: value };
    setForm(next);
    setFormError('');
    // Once a field has shown an error, re-check it as the person fixes it.
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: validateLogin(next)[field] }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const found = validateLogin(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) {
      (found.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }

    setPhase('submitting');
    try {
      // The role comes back from the server. It is never taken from anything on this page.
      const signedIn = await login({
        identifier: form.identifier.trim(),
        password: form.password,
        remember: form.remember,
      });
      setPhase('success');
      await wait(700);
      const requested = location.state?.from;
      const home = homePathForRole(signedIn.role);
      // First sign-in with a temporary password: choose a personal password before anything else.
      if (signedIn.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      // Return to the page they were trying to open only if their role may use it.
      navigate(requested && requested.startsWith(home) ? requested : home, { replace: true });
    } catch (error) {
      setPhase('idle');
      setForm((current) => ({ ...current, password: '' }));
      setFormError(error.message || 'We could not sign you in. Please try again.');
      // The inputs are disabled until the next render, so wait one tick to focus.
      setTimeout(() => passwordRef.current?.focus(), 0);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-black text-navy-900">Welcome Back</h1>
      <p className="mt-2 text-base leading-relaxed text-navy-700">
        Sign in to securely access the school portal for results, attendance, fees and homework.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5" aria-busy={busy}>
        {formError && <Alert tone="error" title="Sign-in failed">{formError}</Alert>}
        {phase === 'success' && (
          <Alert tone="success" title="Signed in">
            Taking you to your dashboard…
          </Alert>
        )}

        <TextField
          id="identifier"
          ref={identifierRef}
          label="Email address or username"
          icon={User}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Email address or username"
          value={form.identifier}
          onChange={update('identifier')}
          error={errors.identifier}
          disabled={busy}
        />

        <div>
          <PasswordField
            id="password"
            ref={passwordRef}
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={update('password')}
            onCapsLockChange={setCapsLock}
            error={errors.password}
            disabled={busy}
          />
          {capsLock && !errors.password && (
            <p className="mt-1.5 text-sm font-semibold text-amber-800">Caps Lock is on.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Checkbox
            id="remember"
            label="Remember me"
            checked={form.remember}
            onChange={update('remember')}
            disabled={busy}
          />
          <Link
            to="/forgot-password"
            className="rounded text-sm font-semibold text-blush-700 underline underline-offset-4 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={phase === 'submitting'}
          icon={phase === 'success' ? CircleCheck : LogIn}
          disabled={busy}
          className="w-full"
        >
          {phase === 'submitting' ? 'Signing in…' : phase === 'success' ? 'Signed in' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-navy-700">
        Accounts are created by the school office. If you do not have one yet, please contact the school.
      </p>
    </AuthLayout>
  );
}
