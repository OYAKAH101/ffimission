import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';
import { requestPasswordReset } from '../services/authService';
import { validateEmailOnly } from '../utils/validators';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const problem = validateEmailOnly(email);
    setError(problem);
    if (problem) return;

    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'We could not send the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-navy-700 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marian-600"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>

      <h1 className="mt-6 font-display text-3xl font-black text-navy-900">Forgot your password?</h1>
      <p className="mt-2 text-base leading-relaxed text-navy-700">
        Enter the email address linked to your account. The request goes to the school office, who will
        give you a new temporary password. Your pupil&rsquo;s username and password can only be reset by the school office.
      </p>

      {sent ? (
        <div className="mt-8 space-y-4">
          <Alert tone="success" title="Request received">
            If {email.trim()} belongs to an account, the school office has been told and will contact you with a
            new temporary password. No email is sent automatically.
          </Alert>
          <Button as={Link} to="/login" variant="secondary" size="lg" className="w-full">
            Return to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          <TextField
            id="reset-email"
            label="Email address"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError('');
            }}
            error={error}
            disabled={submitting}
          />
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
