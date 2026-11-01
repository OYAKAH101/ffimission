import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { Alert, Button, PasswordField } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { homePathForRole } from '../utils/roles';

const MIN_LENGTH = 8;

// Shown to anyone signing in with a temporary password (and open to anyone who wants to change theirs).
// The server checks the current password and the new one again; these checks only save a round trip.
export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = {};
    if (!form.current) found.current = 'Enter your current password.';
    if (form.next.length < MIN_LENGTH) found.next = `Use at least ${MIN_LENGTH} characters.`;
    else if (form.next === form.current) found.next = 'Choose a password you have not used before.';
    if (form.confirm !== form.next) found.confirm = 'The two new passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const updated = await changePassword({ currentPassword: form.current, newPassword: form.next });
      navigate(homePathForRole(updated.role), { replace: true });
    } catch (error) {
      const field = { currentPassword: 'current', newPassword: 'next' }[error.data?.field];
      if (field) setErrors({ [field]: error.message });
      else setFormError(error.message || 'We could not change your password. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-black text-navy-900">Choose a new password</h1>
      <p className="mt-2 text-base leading-relaxed text-navy-700">
        {user.mustChangePassword
          ? 'You signed in with a temporary password. Choose your own to continue. Only you should know it.'
          : 'Enter your current password, then choose a new one.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && <Alert tone="error" title="Password not changed">{formError}</Alert>}

        <PasswordField
          id="current-password"
          label={user.mustChangePassword ? 'Temporary password' : 'Current password'}
          autoComplete="current-password"
          value={form.current}
          onChange={update('current')}
          error={errors.current}
          disabled={submitting}
        />
        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_LENGTH} characters`}
          value={form.next}
          onChange={update('next')}
          error={errors.next}
          disabled={submitting}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          disabled={submitting}
        />

        <Button type="submit" size="lg" icon={KeyRound} loading={submitting} className="w-full">
          {submitting ? 'Saving…' : 'Save new password'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={submitting}
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </Button>
      </form>
    </AuthLayout>
  );
}
