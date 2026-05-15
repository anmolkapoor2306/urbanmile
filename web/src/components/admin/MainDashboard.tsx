'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AdminPanel, AdminStatCard, AdminStatsGrid, adminSecondaryButtonClassName } from '@/components/admin/AdminLayout';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { buildBookingMetrics, getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { getBookingStatusLabel, getDriverTypeLabel, getPaymentStatusLabel } from '@/lib/dispatch';
import { cn, getCarTypeDisplay } from '@/lib/utils';

type RevenuePaymentsSummary = {
  revenueToday: number;
  collectedAmount: number;
  pendingAmount: number;
  totalBookingsToday: number;
};

export function MainDashboard({
  bookings,
  drivers,
}: {
  bookings: SerializedBooking[];
  drivers: SerializedDriver[];
}) {
  const router = useRouter();
  const [bookingOverrides, setBookingOverrides] = useState<Record<string, SerializedBooking>>({});
  const dashboardBookings = useMemo(
    () => bookings.map((booking) => bookingOverrides[booking.id] ?? booking),
    [bookingOverrides, bookings]
  );
  const metrics = buildBookingMetrics(dashboardBookings);
  const revenuePayments = useMemo(() => buildRevenuePayments(dashboardBookings), [dashboardBookings]);
  const [detailBooking, setDetailBooking] = useState<SerializedBooking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const availableDrivers = useMemo(() => {
    if (!selectedBooking) return [];

    return drivers
      .filter((driver) => isDriverAvailableForBooking(driver, dashboardBookings, selectedBooking))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dashboardBookings, drivers, selectedBooking]);

  function openAssignModal(booking: SerializedBooking) {
    setDetailBooking(null);
    setSelectedBooking(booking);
    setSelectedDriverId(null);
    setAssignmentMessage(null);
  }

  function closeAssignModal() {
    setSelectedBooking(null);
    setSelectedDriverId(null);
    setAssignmentMessage(null);
  }

  async function confirmAssignment() {
    if (!selectedBooking || !selectedDriverId) return;

    setIsAssigning(true);
    setAssignmentMessage(null);

    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriverId, status: 'ASSIGNED' }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not assign driver.');
      }

      closeAssignModal();
      router.refresh();
    } catch (error) {
      setAssignmentMessage((error as Error).message || 'Could not assign driver.');
    } finally {
      setIsAssigning(false);
    }
  }

  async function saveBookingDetails(booking: SerializedBooking, input: { fareAmount: number; pickupDateTime: string }) {
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not update booking.');
    }

    const updatedBooking = data.data as SerializedBooking;
    setBookingOverrides((current) => ({ ...current, [updatedBooking.id]: updatedBooking }));
    setDetailBooking(updatedBooking);
    setSelectedBooking((current) => (current?.id === updatedBooking.id ? updatedBooking : current));
    router.refresh();
    return updatedBooking;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Assign trusted drivers, monitor active trips, and keep payment visibility clear.
        </p>
      </div>

      <AdminStatsGrid className="mb-0 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Needs Assignment" value={metrics.needsAssignment} />
        <AdminStatCard label="Assigned Upcoming" value={metrics.assignedUpcoming} />
        <AdminStatCard label="Active Trips" value={metrics.activeTripsCount} />
        <AdminStatCard label="Completed Today" value={metrics.completedToday} />
        <AdminStatCard label="Revenue Today" value={formatMoney(metrics.revenueToday ?? 0)} />
      </AdminStatsGrid>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <NeedsAssignmentPanel
          bookings={metrics.confirmedWaitingForAssignment}
          onOpenDetails={setDetailBooking}
          onAssign={openAssignModal}
        />
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
          <LiveTripsPanel bookings={metrics.liveTrips} />
          <RevenuePaymentsPanel summary={revenuePayments} />
        </div>
      </div>

      {detailBooking ? (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onAssign={openAssignModal}
          onSave={saveBookingDetails}
        />
      ) : null}

      {selectedBooking ? (
        <AssignDriverModal
          booking={selectedBooking}
          drivers={availableDrivers}
          selectedDriverId={selectedDriverId}
          isSaving={isAssigning}
          message={assignmentMessage}
          onSelectDriver={setSelectedDriverId}
          onClose={closeAssignModal}
          onConfirm={confirmAssignment}
        />
      ) : null}
    </div>
  );
}

function NeedsAssignmentPanel({
  bookings,
  onOpenDetails,
  onAssign,
}: {
  bookings: SerializedBooking[];
  onOpenDetails: (booking: SerializedBooking) => void;
  onAssign: (booking: SerializedBooking) => void;
}) {
  return (
    <AdminPanel className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-black text-zinc-950 dark:text-white xl:text-lg">Needs Assignment</h2>
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-black text-amber-800 dark:bg-amber-400 dark:text-zinc-950">
              {bookings.length}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 xl:text-sm">Confirmed rides waiting for a driver.</p>
        </div>
        <Link href="/admin/dispatch" className={cn(adminSecondaryButtonClassName, 'hidden shrink-0 px-3 py-1.5 text-xs sm:inline-flex')}>
          Open Dispatch
        </Link>
      </div>

      <div className="hidden shrink-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_76px] gap-3 border-b border-zinc-200 px-3 pb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-500 xl:grid">
        <span>Booking ID</span>
        <span>Route</span>
        <span>Pickup Time</span>
        <span>Vehicle</span>
        <span>Fare</span>
        <span>Payment</span>
        <span className="text-right">Action</span>
      </div>

      <div className="dashboard-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No confirmed rides are waiting for assignment." />
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {bookings.map((booking) => (
              <NeedsAssignmentRow key={booking.id} booking={booking} onOpenDetails={onOpenDetails} onAssign={onAssign} />
            ))}
          </div>
        )}
      </div>
    </AdminPanel>
  );
}

function LiveTripsPanel({ bookings }: { bookings: SerializedBooking[] }) {
  return (
    <AdminPanel className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <PanelHeader title="Live Trips" subtitle="Assigned and active trips currently under dispatch control." />
      <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No assigned or active trips right now." />
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {bookings.map((booking) => (
              <div key={booking.id} className="grid min-w-0 gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', statusClass(booking.status))}>
                      {getBookingStatusLabel(booking.status as never)}
                    </span>
                    <span className="min-w-0 truncate text-sm font-black text-zinc-950 dark:text-white">{booking.publicBookingId || booking.bookingReference}</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {booking.pickupLocation} to {booking.dropoffLocation}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>{getBookingDisplayAssignee(booking)}</span>
                    <span>{getCarTypeDisplay(booking.carType)}</span>
                    <span>{formatDateTime(booking.pickupDateTime)}</span>
                  </div>
                </div>
                {booking.phone ? (
                  <a href={`tel:${booking.phone}`} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white dark:bg-amber-400 dark:text-zinc-950">
                    Call
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPanel>
  );
}

function RevenuePaymentsPanel({
  summary,
}: {
  summary: RevenuePaymentsSummary;
}) {
  return (
    <AdminPanel className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <PanelHeader title="Revenue & Payments" subtitle="Collections, pending fares, and unpaid follow-ups." />
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
        <RevenueSummaryCard label="Revenue Today" value={formatMoney(summary.revenueToday)} />
        <RevenueSummaryCard label="Collected Amount" value={formatMoney(summary.collectedAmount)} />
        <RevenueSummaryCard label="Pending Amount" value={formatMoney(summary.pendingAmount)} tone="warning" />
        <RevenueSummaryCard label="Bookings Today" value={String(summary.totalBookingsToday)} />
      </div>
    </AdminPanel>
  );
}

function RevenueSummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className={cn(
      'flex min-h-0 min-w-0 flex-col justify-center rounded-xl border p-3',
      tone === 'warning'
        ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
    )}>
      <div className={cn(
        'truncate text-[11px] font-black uppercase tracking-wide',
        tone === 'warning' ? 'text-amber-800 dark:text-amber-200' : 'text-zinc-500 dark:text-zinc-400'
      )}>
        {label}
      </div>
      <div className="mt-1 truncate text-base font-black text-zinc-950 dark:text-white" title={value}>{value}</div>
    </div>
  );
}

function NeedsAssignmentRow({
  booking,
  onOpenDetails,
  onAssign,
}: {
  booking: SerializedBooking;
  onOpenDetails: (booking: SerializedBooking) => void;
  onAssign: (booking: SerializedBooking) => void;
}) {
  const urgency = getPickupUrgency(booking.pickupDateTime);
  const bookingDisplayId = booking.publicBookingId || booking.bookingReference;
  const route = `${booking.pickupLocation} -> ${booking.dropoffLocation}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(booking)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails(booking);
        }
      }}
      className="grid min-w-0 cursor-pointer gap-2 bg-white px-3 py-2.5 text-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400/60 dark:bg-zinc-950 dark:hover:bg-zinc-900 xl:min-h-[56px] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_76px] xl:items-center xl:gap-3"
    >
      <div className="min-w-0 truncate font-black text-zinc-950 dark:text-white" title={bookingDisplayId}>
        {bookingDisplayId}
      </div>
      <div className="min-w-0 truncate font-semibold text-zinc-800 dark:text-zinc-200" title={route}>
        {booking.pickupLocation} &rarr; {booking.dropoffLocation}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold text-zinc-700 dark:text-zinc-300">{formatDateTime(booking.pickupDateTime)}</div>
        <div className={cn('mt-0.5 text-xs font-black', urgency.className)}>{urgency.label}</div>
      </div>
      <div className="truncate font-semibold text-zinc-600 dark:text-zinc-400">{getCarTypeDisplay(booking.carType)}</div>
      <div className="truncate font-bold text-zinc-800 dark:text-zinc-200">{booking.fareAmount != null ? formatMoney(booking.fareAmount) : 'Fare pending'}</div>
      <div className="min-w-0">
        <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-bold leading-none', paymentClass(booking.paymentStatus))}>
          {getPaymentStatusLabel(booking.paymentStatus as never)}
        </span>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAssign(booking);
        }}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-amber-400 px-3 text-xs font-black text-zinc-950 transition-colors hover:bg-amber-300 xl:justify-self-end"
      >
        Assign
      </button>
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
  onAssign,
  onSave,
}: {
  booking: SerializedBooking;
  onClose: () => void;
  onAssign: (booking: SerializedBooking) => void;
  onSave: (booking: SerializedBooking, input: { fareAmount: number; pickupDateTime: string }) => Promise<SerializedBooking>;
}) {
  const [fareValue, setFareValue] = useState(booking.fareAmount?.toString() ?? '');
  const [pickupDate, setPickupDate] = useState(toDateInputValue(booking.pickupDateTime));
  const [pickupTime, setPickupTime] = useState(toTimeInputValue(booking.pickupDateTime));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const bookingDisplayId = booking.publicBookingId || booking.bookingReference;
  const notes = [booking.specialInstructions, booking.internalNotes].filter(Boolean).join('\n');

  useEffect(() => {
    setFareValue(booking.fareAmount?.toString() ?? '');
    setPickupDate(toDateInputValue(booking.pickupDateTime));
    setPickupTime(toTimeInputValue(booking.pickupDateTime));
  }, [booking.fareAmount, booking.pickupDateTime]);

  async function handleSave() {
    const parsedFare = Number(fareValue);

    if (!Number.isFinite(parsedFare) || parsedFare <= 0) {
      setMessage({ type: 'error', text: 'Fare must be a valid positive number.' });
      return;
    }

    if (!pickupDate || !pickupTime) {
      setMessage({ type: 'error', text: 'Pickup date and time are required.' });
      return;
    }

    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);

    if (Number.isNaN(pickupDateTime.getTime())) {
      setMessage({ type: 'error', text: 'Pickup date/time is invalid.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedBooking = await onSave(booking, {
        fareAmount: parsedFare,
        pickupDateTime: pickupDateTime.toISOString(),
      });

      setFareValue(updatedBooking.fareAmount?.toString() ?? '');
      setPickupDate(toDateInputValue(updatedBooking.pickupDateTime));
      setPickupTime(toTimeInputValue(updatedBooking.pickupDateTime));
      setMessage({ type: 'success', text: 'Booking changes saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message || 'Could not update booking.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        className={cn(
          'flex max-h-full w-full max-w-2xl min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950',
          isDatePickerOpen ? 'overflow-visible' : 'overflow-hidden'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">Booking Details</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">{bookingDisplayId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div
          className={cn(
            'dashboard-scrollbar min-h-0 flex-1 px-5 py-4',
            isDatePickerOpen ? 'overflow-visible' : 'overflow-y-auto'
          )}
        >
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
            <Detail label="Booking ID" value={bookingDisplayId} />
            <Detail label="Customer Name" value={booking.fullName || booking.customerName || 'Unknown'} />
            <Detail label="Phone" value={booking.phone || booking.customerPhone || 'Not provided'} />
            <Detail label="Route" value={`${booking.pickupLocation} to ${booking.dropoffLocation}`} />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pickup Date/Time</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <CustomDatePicker
                  value={pickupDate}
                  onChange={setPickupDate}
                  onOpenChange={setIsDatePickerOpen}
                />
                <CustomTimePicker
                  value={pickupTime}
                  onChange={setPickupTime}
                />
              </div>
            </div>
            <Detail label="Ride Type" value={formatEnumLabel(booking.bookingType)} />
            <Detail label="Vehicle Type" value={getCarTypeDisplay(booking.carType)} />
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Fare</div>
              <input
                type="number"
                min="0"
                step="1"
                value={fareValue}
                onChange={(event) => setFareValue(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-300"
              />
            </div>
            <Detail label="Payment Status" value={getPaymentStatusLabel(booking.paymentStatus as never)} />
            <Detail label="Booking Status" value={getBookingStatusLabel(booking.status as never)} />
          </div>

          {notes ? <LongDetail label="Notes" value={notes} /> : null}

          {message ? (
            <div
              className={cn(
                'mt-4 rounded-xl border px-4 py-3 text-sm font-bold',
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
              )}
            >
              {message.text}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClassName}>
            Close
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => onAssign(booking)}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Assign Driver
          </button>
        </div>
      </div>
    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const DEFAULT_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CustomDatePicker({
  value,
  onChange,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value || toDateValueFromDate(new Date()));
  const tempDateRef = useRef(tempDate);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthDate(value));
  const [calendarPlacement, setCalendarPlacement] = useState<'down' | 'up'>('down');
  const todayValue = toDateValueFromDate(new Date());
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !pickerRef.current?.contains(target)) {
        closeDatePicker();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDatePicker();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function openDatePicker() {
    const nextDate = value || todayValue;
    updateTempDate(nextDate);
    setVisibleMonth(getMonthDate(nextDate));
    setIsOpen((current) => {
      const nextIsOpen = !current;
      if (nextIsOpen) {
        const triggerRect = pickerRef.current?.getBoundingClientRect();
        const spaceBelow = triggerRect ? window.innerHeight - triggerRect.bottom : Number.POSITIVE_INFINITY;
        setCalendarPlacement(spaceBelow < 360 ? 'up' : 'down');
      }
      onOpenChange?.(nextIsOpen);
      return nextIsOpen;
    });
  }

  function handleCancel() {
    updateTempDate(value || todayValue);
    setVisibleMonth(getMonthDate(value || todayValue));
    closeDatePicker();
  }

  function handleOk() {
    onChange(tempDateRef.current);
    closeDatePicker();
  }

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function updateTempDate(nextDate: string) {
    tempDateRef.current = nextDate;
    setTempDate(nextDate);
  }

  function closeDatePicker() {
    setIsOpen(false);
    onOpenChange?.(false);
  }

  return (
    <div ref={pickerRef} className={cn('relative min-w-0', isOpen && 'z-[120]')}>
      <button
        type="button"
        onClick={openDatePicker}
        className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-300"
      >
        <span className="truncate">{formatDateFieldDisplay(value)}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className={cn(
            'absolute left-0 z-[120] w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/50',
            calendarPlacement === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 text-center text-sm font-black text-zinc-950 dark:text-white">
              {visibleMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-500">
            {WEEKDAY_LABELS.map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateValue = toDateValueFromDate(day.date);
              const isPast = dateValue < todayValue;
              const isSelected = dateValue === tempDate;
              const isToday = dateValue === todayValue;

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isPast}
                  onClick={() => updateTempDate(dateValue)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg text-xs font-black transition-colors',
                    !day.isCurrentMonth && 'text-zinc-400 dark:text-zinc-600',
                    day.isCurrentMonth && 'text-zinc-700 dark:text-zinc-200',
                    isToday && !isSelected && 'border border-amber-300/70 bg-amber-100/60 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200',
                    isSelected && 'bg-amber-400 text-zinc-950 shadow-sm shadow-amber-950/10',
                    isPast && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                    !isPast && !isSelected && 'hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  )}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOk}
              className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-black text-zinc-950 transition-colors hover:bg-amber-300"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tempHour, setTempHour] = useState('01');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('AM');
  const minuteOptions = useMemo(() => buildMinuteOptions(tempMinute), [tempMinute]);

  useEffect(() => {
    if (!isOpen) return;

    const nextParts = parseTimeParts(value);
    setTempHour(nextParts.hour);
    setTempMinute(nextParts.minute);
    setTempPeriod(nextParts.period);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !pickerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleCancel() {
    const nextParts = parseTimeParts(value);
    setTempHour(nextParts.hour);
    setTempMinute(nextParts.minute);
    setTempPeriod(nextParts.period);
    setIsOpen(false);
  }

  function handleOk() {
    onChange(toTwentyFourHourTime(tempHour, tempMinute, tempPeriod));
    setIsOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-300"
      >
        <span className="truncate">{formatTimeDisplay(value)}</span>
        <Clock className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/50">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Hour</span>
              <select
                value={tempHour}
                onChange={(event) => setTempHour(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-bold text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-300"
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Minute</span>
              <select
                value={tempMinute}
                onChange={(event) => setTempMinute(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-bold text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-300"
              >
                {minuteOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-0">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Period</span>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
                {(['AM', 'PM'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setTempPeriod(period)}
                    className={cn(
                      'px-2 py-2 text-xs font-black transition-colors',
                      tempPeriod === period
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOk}
              className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-black text-zinc-950 transition-colors hover:bg-amber-300"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildMinuteOptions(currentMinute: string) {
  if (!currentMinute || DEFAULT_MINUTE_OPTIONS.includes(currentMinute)) {
    return DEFAULT_MINUTE_OPTIONS;
  }

  return [...DEFAULT_MINUTE_OPTIONS, currentMinute].sort((left, right) => Number(left) - Number(right));
}

function parseTimeParts(value: string) {
  const [rawHour, rawMinute] = value.split(':');
  const parsedHour = Number(rawHour);
  const parsedMinute = Number(rawMinute);
  const safeHour = Number.isFinite(parsedHour) ? Math.min(Math.max(parsedHour, 0), 23) : 0;
  const safeMinute = Number.isFinite(parsedMinute) ? Math.min(Math.max(parsedMinute, 0), 59) : 0;
  const period = safeHour >= 12 ? 'PM' : 'AM';
  const hour12 = safeHour % 12 || 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(safeMinute).padStart(2, '0'),
    period: period as 'AM' | 'PM',
  };
}

function toTwentyFourHourTime(hour: string, minute: string, period: 'AM' | 'PM') {
  const parsedHour = Number(hour);
  const safeHour = Number.isFinite(parsedHour) ? Math.min(Math.max(parsedHour, 1), 12) : 12;
  const hour24 = period === 'AM' ? safeHour % 12 : (safeHour % 12) + 12;

  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

function formatTimeDisplay(value: string) {
  if (!value) return 'Select time';

  const parts = parseTimeParts(value);
  return `${parts.hour}:${parts.minute} ${parts.period}`;
}

function AssignDriverModal({
  booking,
  drivers,
  selectedDriverId,
  isSaving,
  message,
  onSelectDriver,
  onClose,
  onConfirm,
}: {
  booking: SerializedBooking;
  drivers: SerializedDriver[];
  selectedDriverId: string | null;
  isSaving: boolean;
  message: string | null;
  onSelectDriver: (driverId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const bookingDisplayId = booking.publicBookingId || booking.bookingReference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">Assign Driver</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Choose an available driver for this booking.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
            <Detail label="Booking ID" value={bookingDisplayId} />
            <Detail label="Route" value={`${booking.pickupLocation} to ${booking.dropoffLocation}`} />
            <Detail label="Pickup Time" value={formatDateTime(booking.pickupDateTime)} />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Available Drivers</div>
            {drivers.length === 0 ? (
              <EmptyState message="No available drivers for this pickup window." />
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => {
                  const isSelected = selectedDriverId === driver.id;

                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => onSelectDriver(driver.id)}
                      className={cn(
                        'grid w-full min-w-0 gap-3 rounded-xl border px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">{driver.name}</div>
                        <div className={cn('mt-1 text-xs font-semibold', isSelected ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400')}>
                          {driver.driverCode || 'DRV-0000'} · {getDriverTypeLabel(driver.driverType as never)} · {driver.phone}
                        </div>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', isSelected ? 'bg-white/15' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100')}>
                        Available
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {message}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={adminSecondaryButtonClassName}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedDriverId || isSaving}
            onClick={onConfirm}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            {isSaving ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-black text-zinc-950 dark:text-white xl:text-lg">{title}</h2>
        <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 xl:text-sm">{subtitle}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={cn(adminSecondaryButtonClassName, 'hidden shrink-0 sm:inline-flex')}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function AvailabilityStat({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', warning ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900')}>
      <div className={cn('text-xs font-bold', warning ? 'text-red-700 dark:text-red-200' : 'text-zinc-500 dark:text-zinc-400')}>{label}</div>
      <div className={cn('mt-2 text-2xl font-black', warning ? 'text-red-700 dark:text-red-200' : 'text-zinc-950 dark:text-white')}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 truncate font-semibold text-zinc-950 dark:text-zinc-100" title={value}>{value}</div>
    </div>
  );
}

function LongDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 whitespace-pre-wrap font-medium text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      {message}
    </div>
  );
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (status === 'ASSIGNED') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
}

function paymentClass(status: string) {
  if (status === 'PAID') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (status === 'PENDING' || status === 'PARTIAL') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
  if (status === 'REFUNDED') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getMonthDate(value: string) {
  const parsedDate = parseDateValue(value);
  const date = parsedDate ?? new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateValueFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateFieldDisplay(value: string) {
  const date = parseDateValue(value);
  if (!date) return 'Select date';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toTimeInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatDateTime(value: string) {
  if (!value) return 'No pickup time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid time';

  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPickupUrgency(value: string) {
  const pickupTime = new Date(value).getTime();
  const hoursUntilPickup = (pickupTime - Date.now()) / (60 * 60 * 1000);

  if (Number.isNaN(pickupTime)) {
    return {
      label: 'No time',
      className: 'text-zinc-500 dark:text-zinc-400',
    };
  }

  if (hoursUntilPickup <= 0) {
    return {
      label: 'Due now',
      className: 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }

  if (hoursUntilPickup < 3) {
    return {
      label: formatTimeToPickup(hoursUntilPickup),
      className: 'text-amber-700 dark:text-amber-300',
    };
  }

  return {
    label: formatTimeToPickup(hoursUntilPickup),
    className: 'text-zinc-500 dark:text-zinc-400',
  };
}

function formatTimeToPickup(hours: number) {
  if (hours <= 0) return 'Due now';
  if (hours < 1) return `${Math.max(Math.round(hours * 60), 1)}m`;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${Math.ceil(hours / 24)}d`;
}

function buildRevenuePayments(bookings: SerializedBooking[]): RevenuePaymentsSummary {
  const today = new Date();
  const todaysBookings = bookings.filter((booking) => isSameCalendarDay(new Date(booking.createdAt), today));
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === 'PAID');
  const unpaidBookings = bookings
    .filter((booking) => booking.paymentStatus === 'UNPAID')
    .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime));

  return {
    revenueToday: sumBookingFares(todaysBookings),
    collectedAmount: sumBookingFares(paidBookings),
    pendingAmount: sumBookingFares(unpaidBookings),
    totalBookingsToday: todaysBookings.length,
  };
}

function sumBookingFares(bookings: SerializedBooking[]) {
  return bookings.reduce((total, booking) => total + (booking.fareAmount ?? 0), 0);
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isDriverAvailableForBooking(
  driver: SerializedDriver,
  bookings: SerializedBooking[],
  targetBooking: SerializedBooking
) {
  if (driver.status !== 'ACTIVE' || driver.dutyStatus !== 'ONLINE') return false;

  const target = new Date(targetBooking.pickupDateTime).getTime();
  const conflictWindowMs = 4 * 60 * 60 * 1000;

  if (Number.isNaN(target)) return false;

  return !bookings.some((booking) => {
    if (booking.id === targetBooking.id || booking.driverId !== driver.id) return false;
    if (!['ASSIGNED', 'ACTIVE'].includes(booking.status)) return false;

    const pickupTime = new Date(booking.pickupDateTime).getTime();
    return !Number.isNaN(pickupTime) && Math.abs(pickupTime - target) < conflictWindowMs;
  });
}

function findNextBookingForDriver(bookings: SerializedBooking[], driverId: string) {
  const now = Date.now();
  return [...bookings]
    .filter((booking) => booking.driverId === driverId && ['ASSIGNED', 'ACTIVE'].includes(booking.status) && new Date(booking.pickupDateTime).getTime() >= now)
    .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime))[0] ?? null;
}
