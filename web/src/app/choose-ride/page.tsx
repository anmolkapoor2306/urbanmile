import { Navbar } from '@/components/layout/Navbar';
import { BookingForm } from '@/components/form/BookingForm';
import { getCurrentCustomer, serializeCustomer } from '@/lib/customerAccountAuth';

export const dynamic = 'force-dynamic';

export default async function ChooseRidePage() {
  const customer = await getCurrentCustomer();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      <Navbar />
      <div className="lg:min-h-0 lg:flex-1">
        <BookingForm mode="ride-options" initialCustomer={customer ? serializeCustomer(customer) : null} />
      </div>
    </div>
  );
}
