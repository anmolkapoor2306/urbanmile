'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarCheck, Eye, EyeOff, Headphones, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles, Zap } from 'lucide-react';

type Mode = 'identify' | 'password' | 'signup' | 'completeProfile';

type CustomerResponse = {
  success: boolean;
  exists?: boolean;
  error?: string;
  code?: string;
  redirectTo?: string;
  customer?: {
    fullName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    profileComplete: boolean;
  };
  url?: string;
};

type IdentifierType = 'email' | 'phone';

const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get('completeProfile') ? 'completeProfile' : 'identify');
  const [identifier, setIdentifier] = useState('');
  const [confirmedIdentifier, setConfirmedIdentifier] = useState('');
  const [signupIdentifierType, setSignupIdentifierType] = useState<IdentifierType>('phone');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(searchParams.get('error') === 'google' ? 'Google login could not be completed. Please try again.' : '');
  const [signup, setSignup] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'PREFER_NOT_TO_SAY',
    password: '',
    confirmPassword: '',
  });
  const [profile, setProfile] = useState({
    phone: '',
    gender: 'PREFER_NOT_TO_SAY',
  });

  const signupPasswordErrors = useMemo(() => getPasswordErrors(signup.password), [signup.password]);

  useEffect(() => {
    if (!searchParams.get('completeProfile')) return;

    fetch('/api/customer/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Not signed in');
        const data = (await response.json()) as CustomerResponse;
        if (data.customer?.profileComplete) {
          router.replace('/customer/dashboard');
          return;
        }
        setMode('completeProfile');
        setProfile((prev) => ({ ...prev, gender: data.customer?.gender || prev.gender }));
      })
      .catch(() => {
        setMode('identify');
        setError('Please log in to continue.');
      });
  }, [router, searchParams]);

  async function handleIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Enter your email or phone number.');
      return;
    }

    setLoading(true);
    try {
      const identityResponse = await fetch('/api/customer/auth/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedIdentifier }),
      });
      const identity = (await identityResponse.json()) as CustomerResponse;

      if (!identityResponse.ok) {
        setError(identity.error || 'We could not check that account right now.');
        return;
      }

      setConfirmedIdentifier(trimmedIdentifier);
      if (!identity.exists) {
        openSignupFromIdentifier(trimmedIdentifier);
        return;
      }

      setPassword('');
      setMode('password');
    } catch {
      setError('We could not check that account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const loginIdentifier = confirmedIdentifier || identifier.trim();
    if (!loginIdentifier || !password) {
      setError('Enter your password to continue.');
      return;
    }

    setLoading(true);
    try {
      const loginResponse = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password }),
      });
      const data = (await loginResponse.json()) as CustomerResponse;

      if (!loginResponse.ok) {
        if (data.code === 'CUSTOMER_NOT_FOUND') {
          openSignupFromIdentifier(loginIdentifier);
          return;
        }

        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      router.push(data.redirectTo || '/');
      router.refresh();
    } catch {
      setError('Login is unavailable right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!signup.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!signup.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    if (signupIdentifierType === 'email' && !signup.email.trim()) {
      setError('Please keep your email on the signup form.');
      return;
    }

    if (signupPasswordErrors.length > 0) {
      setError(signupPasswordErrors[0]);
      return;
    }

    if (signup.password !== signup.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup),
      });
      const data = (await response.json()) as CustomerResponse;

      if (!response.ok) {
        setError(data.error || 'Signup failed. Please try again.');
        return;
      }

      router.push(data.redirectTo || '/');
      router.refresh();
    } catch {
      setError('Signup is unavailable right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/customer/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = (await response.json()) as CustomerResponse;

      if (!response.ok) {
        setError(data.error || 'Please check your profile details.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('We could not update your profile right now.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);

    try {
      const response = await fetch('/api/customer/auth/google/start', { method: 'POST' });
      const data = (await response.json()) as CustomerResponse;

      if (!response.ok || !data.url) {
        setError(data.error || 'Google login is not configured yet.');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Google login could not start. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  function openSignupFromIdentifier(value: string) {
    const trimmed = value.trim();
    const identifierType: IdentifierType = trimmed.includes('@') ? 'email' : 'phone';
    setSignupIdentifierType(identifierType);
    setSignup({
      fullName: '',
      email: identifierType === 'email' ? trimmed.toLowerCase() : '',
      phone: identifierType === 'phone' ? trimmed : '',
      gender: 'PREFER_NOT_TO_SAY',
      password: '',
      confirmPassword: '',
    });
    setPassword('');
    setMode('signup');
    setError('No account found. Create one to continue.');
  }

  function backToIdentify() {
    setMode('identify');
    setError('');
    setPassword('');
  }

  function openSignupDirectly() {
    setConfirmedIdentifier('');
    setIdentifier('');
    setSignupIdentifierType('phone');
    setSignup({
      fullName: '',
      email: '',
      phone: '',
      gender: 'PREFER_NOT_TO_SAY',
      password: '',
      confirmPassword: '',
    });
    setPassword('');
    setMode('signup');
    setError('');
  }

  const heading = mode === 'signup' ? 'Create your account' : mode === 'completeProfile' ? 'Finish your profile' : mode === 'password' ? 'Enter your password' : 'Log in to ride';
  const subtext = mode === 'identify'
    ? 'Enter your email or phone number to continue and enjoy a seamless booking experience.'
    : mode === 'password'
      ? 'Welcome back. Confirm your password to continue booking with UrbanMiles.'
      : mode === 'signup'
        ? 'Create your UrbanMiles profile once, then book premium rides faster next time.'
        : 'Add the final details needed to keep your ride profile secure and ready.';

  return (
    <section className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full animate-[loginFadeIn_700ms_ease-out_both] overflow-hidden rounded-[28px] border border-amber-300/25 bg-zinc-950/78 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_30px_100px_rgba(0,0,0,0.65),0_0_70px_rgba(245,158,11,0.16)] backdrop-blur-sm">
        <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]">
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-12">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">WELCOME TO URBANMILES</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{heading}</h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-zinc-300">{subtext}</p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
                {error}
              </div>
            ) : null}

            {mode === 'identify' ? (
              <form className="space-y-5" onSubmit={handleIdentify}>
                <Field label="Phone number or email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300/80" aria-hidden="true" />
                    <input
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className={`${inputClassName} pl-12`}
                      autoComplete="username"
                      placeholder="Email or phone"
                    />
                  </div>
                </Field>
                <SubmitButton loading={loading}>Continue</SubmitButton>
                <Divider />
                <GoogleButton loading={googleLoading} onClick={handleGoogleLogin} />
                <p className="text-center text-sm font-semibold text-zinc-400">
                  New to UrbanMiles?{' '}
                  <button type="button" onClick={openSignupDirectly} className="text-amber-300 transition-colors hover:text-amber-200">
                    Sign Up
                  </button>
                </p>
              </form>
            ) : null}

            {mode === 'password' ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                <IdentifierSummary value={confirmedIdentifier || identifier} />
                <Field label="Password">
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                    autoComplete="current-password"
                  />
                </Field>
                <SubmitButton loading={loading}>Continue</SubmitButton>
                <BackButton onClick={backToIdentify}>Back</BackButton>
              </form>
            ) : null}

            {mode === 'signup' ? (
              <form className="space-y-4" onSubmit={handleSignup}>
                {(confirmedIdentifier || identifier) ? <IdentifierSummary value={confirmedIdentifier || identifier} /> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input className={inputClassName} value={signup.fullName} onChange={(event) => setSignupValue('fullName', event.target.value)} autoComplete="name" />
                  </Field>
                  <Field label="Phone number">
                    <input className={inputClassName} value={signup.phone} onChange={(event) => setSignupValue('phone', event.target.value)} autoComplete="tel" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={signupIdentifierType === 'email' ? 'Email' : 'Email optional'}>
                    <input
                      className={inputClassName}
                      value={signup.email}
                      onChange={(event) => setSignupValue('email', event.target.value)}
                      autoComplete="email"
                      required={signupIdentifierType === 'email'}
                    />
                  </Field>
                  <Field label="Gender">
                    <select className={inputClassName} value={signup.gender} onChange={(event) => setSignupValue('gender', event.target.value)}>
                      {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Password">
                  <PasswordInput
                    value={signup.password}
                    onChange={(value) => setSignupValue('password', value)}
                    visible={showSignupPassword}
                    onToggle={() => setShowSignupPassword((value) => !value)}
                    autoComplete="new-password"
                  />
                  {signup.password ? (
                    <PasswordRules errors={signupPasswordErrors} />
                  ) : null}
                </Field>
                <Field label="Confirm password">
                  <PasswordInput
                    value={signup.confirmPassword}
                    onChange={(value) => setSignupValue('confirmPassword', value)}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    autoComplete="new-password"
                  />
                </Field>
                <SubmitButton loading={loading}>Create account</SubmitButton>
                <BackButton onClick={backToIdentify}>Back</BackButton>
              </form>
            ) : null}

            {mode === 'completeProfile' ? (
              <form className="space-y-5" onSubmit={handleProfileCompletion}>
                <Field label="Phone number">
                  <input className={inputClassName} value={profile.phone} onChange={(event) => setProfileValue('phone', event.target.value)} autoComplete="tel" />
                </Field>
                <Field label="Gender">
                  <select className={inputClassName} value={profile.gender} onChange={(event) => setProfileValue('gender', event.target.value)}>
                    {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <SubmitButton loading={loading}>Save and continue</SubmitButton>
              </form>
            ) : null}
          </div>

          <SecureVisual />
        </div>

        <div className="grid gap-px border-t border-amber-300/15 bg-amber-300/10 sm:grid-cols-3">
          <FeatureItem icon={<ShieldCheck className="h-5 w-5" />} title="Safe & Secure" description="Protected account sessions." />
          <FeatureItem icon={<Zap className="h-5 w-5" />} title="Quick Booking" description="Ride details ready faster." />
          <FeatureItem icon={<Headphones className="h-5 w-5" />} title="24/7 Support" description="Help whenever you ride." />
        </div>
      </div>
    </section>
  );

  function setSignupValue(name: keyof typeof signup, value: string) {
    setSignup((prev) => ({ ...prev, [name]: value }));
  }

  function setProfileValue(name: keyof typeof profile, value: string) {
    setProfile((prev) => ({ ...prev, [name]: value }));
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-zinc-100">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function IdentifierSummary({ value }: { value: string }) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-zinc-900/80 px-4 py-3 shadow-inner shadow-black/30">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300/80">Account</p>
      <p className="mt-1 break-words text-sm font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="w-full rounded-2xl py-2 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white" onClick={onClick}>
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
      <div className="h-px flex-1 bg-zinc-800" />
      or
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

function SecureVisual() {
  return (
    <div className="relative hidden overflow-hidden border-l border-amber-300/10 bg-[radial-gradient(circle_at_50%_22%,rgba(251,191,36,0.16),transparent_32%),linear-gradient(145deg,rgba(39,39,42,0.35),rgba(9,9,11,0.72))] p-10 lg:block">
      <div className="absolute left-8 top-10 h-2 w-2 rounded-full bg-amber-300/70 shadow-[0_0_26px_rgba(251,191,36,0.8)]" />
      <div className="absolute right-16 top-24 h-1.5 w-1.5 rounded-full bg-amber-200/50 shadow-[0_0_22px_rgba(251,191,36,0.7)]" />
      <div className="absolute bottom-24 left-20 h-1.5 w-1.5 rounded-full bg-amber-300/50 shadow-[0_0_22px_rgba(251,191,36,0.7)]" />
      <div className="absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative flex h-full min-h-[480px] items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative flex h-56 w-56 items-center justify-center rounded-[44px] border border-amber-300/25 bg-zinc-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(245,158,11,0.14)]">
            <div className="absolute inset-6 rounded-[34px] border border-zinc-700/60" />
            <LockKeyhole className="h-20 w-20 text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]" aria-hidden="true" />
          </div>
          <div className="absolute -right-12 top-6 flex items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/85 px-3 py-2 text-xs font-bold text-zinc-200 shadow-2xl">
            <ShieldCheck className="h-4 w-4 text-amber-300" aria-hidden="true" />
            Secure session
          </div>
          <div className="absolute -bottom-10 -left-14 flex items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/85 px-3 py-2 text-xs font-bold text-zinc-200 shadow-2xl">
            <CalendarCheck className="h-4 w-4 text-amber-300" aria-hidden="true" />
            Ride ready
          </div>
          <Sparkles className="absolute -left-16 top-10 h-5 w-5 animate-pulse text-amber-200/80" aria-hidden="true" />
          <Sparkles className="absolute -right-8 bottom-8 h-4 w-4 animate-pulse text-amber-200/60" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group bg-zinc-950/76 px-5 py-5 transition-colors hover:bg-zinc-900/90">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-300 transition-transform group-hover:-translate-y-0.5">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white">{title}</h2>
          <p className="mt-1 text-sm font-medium text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
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
      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300/75" aria-hidden="true" />
      <input
        className={`${inputClassName} pl-12 pr-12`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder="Password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-300 px-5 text-sm font-black text-zinc-950 shadow-[0_14px_34px_rgba(245,158,11,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-[0_18px_44px_rgba(245,158,11,0.28)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{children}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></>}
    </button>
  );
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-700/90 bg-zinc-950/70 px-5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300/45 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.73-.07-1.43-.19-2.11H12v3.99h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.59A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.08a10.01 10.01 0 0 0 0 8.98l3.33-2.59Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.51l3.33 2.59C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
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
  if (password.length < 8) errors.push('Use at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Add at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Add at least one lowercase letter.');
  if (!/\d/.test(password)) errors.push('Add at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Add at least one special character.');
  return errors;
}

const inputClassName = 'min-h-14 w-full rounded-2xl border border-zinc-700/90 bg-zinc-950/70 px-4 text-base font-semibold text-white shadow-inner shadow-black/20 outline-none transition-all duration-300 placeholder:text-zinc-500 hover:border-zinc-600 focus:border-amber-300 focus:bg-zinc-950 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.10)]';
