import { Suspense } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { CustomerLogin } from '@/components/customer/CustomerLogin';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <Image
        src="/images/urbanmiles-login-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover opacity-70"
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.72)_45%,rgba(9,9,11,0.84)_100%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_35%_18%,rgba(245,158,11,0.20),transparent_30%),radial-gradient(circle_at_75%_78%,rgba(251,191,36,0.12),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.38),rgba(9,9,11,0.90))]" />
      <Navbar />
      <div className="relative z-10">
        <Suspense fallback={<div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center px-4 text-zinc-300">Loading...</div>}>
          <CustomerLogin />
        </Suspense>
      </div>
    </main>
  );
}
