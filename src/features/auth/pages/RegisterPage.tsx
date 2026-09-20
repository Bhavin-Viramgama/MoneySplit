import { AuthLayout } from '../components/AuthLayout';
import { RegisterForm } from '../components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start tracking finances with friends"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
