import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CustomerAccountForm } from '@/components/customer/CustomerAccountForm';
import { getCurrentCustomerSession, serializeCustomer } from '@/lib/customerAccountAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage() {
  const session = await getCurrentCustomerSession();
  if (!session) redirect('/login');

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      publicId: true,
      name: true,
      fullName: true,
      phone: true,
      email: true,
      gender: true,
      authProvider: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!customer) redirect('/login');

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-5">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Manage account</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Account settings</h1>
        </div>
        <CustomerAccountForm customer={serializeCustomer(customer)} hasPassword={Boolean(customer.passwordHash)} />
      </section>
    </main>
  );
}
