'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { formatIndianPhoneDisplay } from '@/lib/customerDisplay';

type AccountCustomer = {
  fullName: string;
  email: string | null;
  phone: string | null;
};

type AccountResponse = {
  success: boolean;
  error?: string;
  customer?: AccountCustomer;
  hasPassword?: boolean;
};

export function CustomerAccountForm({
  customer,
  hasPassword,
}: {
  customer: AccountCustomer;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: customer.fullName,
    email: customer.email || '',
    phone: formatIndianPhoneDisplay(customer.phone),
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordExists, setPasswordExists] = useState(hasPassword);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const passwordErrors = useMemo(() => getPasswordErrors(form.newPassword), [form.newPassword]);
  const wantsPasswordChange = Boolean(form.currentPassword || form.newPassword || form.confirmPassword);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (wantsPasswordChange) {
      if (passwordExists && !form.currentPassword) {
        setError('Enter your current password before changing it.');
        return;
      }

      if (passwordErrors.length > 0) {
        setError(passwordErrors[0]);
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await response.json() as AccountResponse;

      if (!response.ok) {
        setError(data.error || 'We could not update your account.');
        return;
      }

      if (data.customer) {
        setForm((current) => ({
          ...current,
          fullName: data.customer?.fullName || current.fullName,
          email: data.customer?.email || '',
          phone: formatIndianPhoneDisplay(data.customer?.phone),
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      }
      setPasswordExists(Boolean(data.hasPassword));
      setMessage('Account updated.');
      router.refresh();
    } catch {
      setError('We could not update your account right now.');
    } finally {
      setLoading(false);
    }
  }

  function setValue(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message ? (
        <div className="rounded-md border border-green-400/40 bg-green-400/10 px-4 py-3 text-sm font-semibold text-green-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-black text-white">Profile</h2>
        <div className="mt-5 grid gap-4">
          <Field label="Full name">
            <input className={inputClassName} value={form.fullName} onChange={(event) => setValue('fullName', event.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email">
            <input className={inputClassName} value={form.email} onChange={(event) => setValue('email', event.target.value)} autoComplete="email" />
          </Field>
          <Field label="Phone number">
            <input className={inputClassName} value={form.phone} onChange={(event) => setValue('phone', event.target.value)} autoComplete="tel" />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-black text-white">{passwordExists ? 'Change password' : 'Set password'}</h2>
        <div className="mt-5 grid gap-4">
          {passwordExists ? (
            <Field label="Current password">
              <PasswordInput
                value={form.currentPassword}
                onChange={(value) => setValue('currentPassword', value)}
                visible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((visible) => !visible)}
                autoComplete="current-password"
              />
            </Field>
          ) : null}
          <Field label="New password">
            <PasswordInput
              value={form.newPassword}
              onChange={(value) => setValue('newPassword', value)}
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((visible) => !visible)}
              autoComplete="new-password"
            />
            {form.newPassword ? <PasswordRules errors={passwordErrors} /> : null}
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              value={form.confirmPassword}
              onChange={(value) => setValue('confirmPassword', value)}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((visible) => !visible)}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </section>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-black text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-zinc-100">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <input
        className={`${inputClassName} pr-12`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PasswordRules({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return <p className="mt-2 text-xs font-semibold text-green-300">Password looks good.</p>;
  }

  return (
    <ul className="mt-2 space-y-1 text-xs font-semibold text-amber-200">
      {errors.map((rule) => <li key={rule}>{rule}</li>)}
    </ul>
  );
}

function getPasswordErrors(password: string) {
  const errors: string[] = [];
  if (!password) return errors;
  if (password.length < 8) errors.push('Use at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Add at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Add at least one lowercase letter.');
  if (!/\d/.test(password)) errors.push('Add at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Add at least one special character.');
  return errors;
}

const inputClassName = 'min-h-12 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 text-base font-semibold text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300';
