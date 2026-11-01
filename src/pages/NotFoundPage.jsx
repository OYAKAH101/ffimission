import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-black text-navy-900">Page not found</h1>
      <p className="mt-2 text-base leading-relaxed text-navy-700">
        The address you opened does not exist in the portal. Check the link, or go back to the start.
      </p>
      <Button as={Link} to="/" size="lg" className="mt-8 w-full">
        Go to the portal
      </Button>
    </AuthLayout>
  );
}
