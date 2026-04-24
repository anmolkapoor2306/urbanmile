'use client';

import { useMemo, useState } from 'react';
import {
  AdminPanel,
  AdminStatCard,
  AdminStatsGrid,
} from '@/components/admin/AdminLayout';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { getBookingStatusLabel, getDriverTypeLabel } from '@/lib/dispatch';
import { buildDispatchMetrics } from '@/lib/opsDashboard';
import { cn, getCarTypeDisplay } from '@/lib/utils';

type QueueFilter = 'READY' | 'ASSIGNED' | 'ACTIVE' | 'ALL';

export function DispatchBoard({
  drivers,
  bookings,
}: {
  drivers: SerializedDriver[];
  bookings: SerializedBooking[];
}) {
  const activeDrivers = drivers.filter((driver) => driver.isActive);
  const availableDrivers = activeDrivers.filter((driver) => driver.availabilityStatus === 'AVAILABLE');
  const metrics = buildDispatchMetrics(bookings, activeDrivers);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL');
  // State for trip and driver selection
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<SerializedDriver | null>(null);

  const queueBookings = useMemo(() => {
    switch (queueFilter) {
      case 'READY':
        return bookings.filter((booking) => booking.status === 'CONFIRMED');
      case 'ASSIGNED':
        return bookings.filter((booking) => booking.status === 'ASSIGNED');
      case 'ACTIVE':
        return bookings.filter((booking) => booking.status === 'ACTIVE');
      case 'ALL':
      default:
        return bookings;
    }
  }, [bookings, queueFilter]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden">
      <AdminStatsGrid className="md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Total Drivers', metrics.totalDrivers],
          ['Available Drivers', metrics.availableDrivers],
          ['Busy Drivers', metrics.busyDrivers],
          ['Waiting for Dispatch', metrics.confirmedWaitingForDispatch],
          ['Active Trips', metrics.activeTrips],
          ['Completed Today', metrics.completedToday],
        ].map(([label, value]) => (
          <AdminStatCard key={label} label={label} value={value} />
        ))}
      </AdminStatsGrid>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 md:grid-cols-3">
           <DispatchQueueColumn
             bookings={queueBookings}
             filter={queueFilter}
             onFilterChange={setQueueFilter}
             selectedBooking={selectedBooking}
             setSelectedBooking={setSelectedBooking}
           />
         <AssignmentPanelColumn
           selectedBooking={selectedBooking}
           selectedDriver={selectedDriver}
         />
         <AvailableDriversColumn drivers={availableDrivers} selectedDriver={selectedDriver} setSelectedDriver={setSelectedDriver} />
      </div>
    </div>
  );
}

function DispatchQueueColumn({
  bookings,
  filter,
  onFilterChange,
  selectedBooking,
  setSelectedBooking,
}: {
  bookings: SerializedBooking[];
  filter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  selectedBooking: SerializedBooking | null;
  setSelectedBooking: (booking: SerializedBooking | null) => void;
}) {
  return (
    <AdminPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-100">Dispatch Queue</h2>
              <p className="text-xs text-zinc-400 mt-1">Confirmed rides waiting for driver assignment.</p>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300">{bookings.length}</span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
          {[
            ['ALL', 'All'],
            ['READY', 'Confirmed'],
            ['ASSIGNED', 'Assigned'],
            ['ACTIVE', 'Active'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key as QueueFilter)}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-scrollbar flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
         {bookings.length === 0 ? (
           <EmptyState message="No bookings in this queue." />
         ) : (
           bookings.map((booking, index) => (
             <BookingCard
               key={booking.id}
               booking={booking}
               isSelected={selectedBooking?.id === booking.id}
               onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
             />
           ))
         )}
 
      </div>
    </AdminPanel>
  );
}

function AssignmentPanelColumn({
  selectedBooking,
  selectedDriver,
}: {
  selectedBooking: SerializedBooking | null;
  selectedDriver: SerializedDriver | null;
}) {
  // State for future selection functionality from the Dispatch Queue and Available Drivers
  const [selectedStateBooking, setSelectedStateBooking] = useState<SerializedBooking | null>(selectedBooking);
  const [selectedStateDriver, setSelectedStateDriver] = useState<SerializedDriver | null>(selectedDriver);
  
  // Use the props if they change from the parent
  if (selectedBooking !== selectedStateBooking) {
    setSelectedStateBooking(selectedBooking);
  }
  if (selectedDriver !== selectedStateDriver) {
    setSelectedStateDriver(selectedDriver);
  }
  
  const selectedBookingToShow = selectedStateBooking && selectedStateBooking !== null ? selectedStateBooking : null;
  const selectedDriverToShow = selectedStateDriver && selectedStateDriver !== null ? selectedStateDriver : null;
  

  return (
    <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
      <div className="shrink-0">
        <div className="mb-3">
          <h2 className="text-base font-bold text-zinc-100">Assignment</h2>
          <p className="text-xs text-zinc-400 mt-1">Select a trip and a driver to assign.</p>
        </div>
      </div>
      <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">


          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Selected Trip</h3>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-zinc-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-zinc-100 mb-2">
                {selectedBookingToShow?.pickupLocation || 'No trip selected'} → {selectedBookingToShow?.dropoffLocation || 'No trip selected'}
              </div>
              <div className="text-xs text-zinc-400 mb-2">
                {selectedBookingToShow?.pickupDateTime ? `${formatDate(selectedBookingToShow.pickupDateTime)}, ${formatTime(selectedBookingToShow.pickupDateTime)}` : 'Date & time'}
              </div>
              <div className="text-xs text-zinc-400 mb-2">
                {selectedBookingToShow?.fullName || 'Customer name'} · {selectedBookingToShow?.phone || 'Phone'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-100">
                {selectedBookingToShow?.fareAmount ? formatMoney(selectedBookingToShow.fareAmount) : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Driver Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Selected Driver</h3>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-zinc-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-zinc-100 mb-1">
                {selectedDriverToShow?.name || 'No driver selected'}
              </div>
              <div className="text-xs text-zinc-400 mb-2">
                {selectedDriverToShow?.driverType ? getDriverTypeLabel(selectedDriverToShow.driverType as never) : 'Driver type'}
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 inline-block">
                {selectedDriverToShow?.availabilityStatus || 'Available'}
              </span>
            </div>
            <div>
              <button type="button" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        </div>

        {/* Ready State */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
          <div className="mb-3">
            <div className="mx-auto h-8 w-8 text-zinc-600">✓</div>
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">Ready to assign</h3>
          <p className="text-xs text-zinc-400">Click &apos;Assign Trip&apos; to assign this driver to the trip.</p>
        </div>

        {/* Main actions */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <button type="button" className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
            Clear Selection
          </button>
           <button type="button" className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 enabled:bg-amber-500 enabled:hover:bg-amber-600 disabled:bg-amber-500/50 disabled:hover:bg-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60" disabled={!selectedDriverToShow || !selectedBookingToShow}>
            Assign Trip
          </button>
        </div>

        {/* Other actions */}
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-zinc-400 mb-3 px-2">Other Actions</h4>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
              Start Trip
            </button>
            <button type="button" className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
              Mark Complete
            </button>
            <button type="button" className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
              Cancel Trip
            </button>
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}

function AvailableDriversColumn({
  drivers,
  selectedDriver,
  setSelectedDriver,
}: {
  drivers: SerializedDriver[];
  selectedDriver: SerializedDriver | null;
  setSelectedDriver: (driver: SerializedDriver | null) => void;
}) {
  // Use the props for selection state

  return (
    <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
      <div className="shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Available Drivers</h2>
            <p className="text-xs text-zinc-400 mt-1">Only drivers currently marked available are shown here.</p>
          </div>
          <span className="text-xs text-zinc-400">{drivers.length}</span>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search driver by name or phone..."
              className="w-full rounded-lg bg-zinc-950/70 border border-zinc-800 px-4 py-2.5 pl-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              🔍
            </div>
          </div>
        </div>
      </div>

       <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
         {drivers.length === 0 ? (
           <EmptyState message="No available drivers right now." />
         ) : (
           drivers.map((driver) => (
             <div
               key={driver.id}
               onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
               className={cn(
                 "rounded-2xl border bg-zinc-950/70 px-3 py-4 cursor-pointer transition-all hover:border-zinc-700 overflow-hidden",
                 selectedDriver?.id === driver.id ? "border-amber-500 bg-amber-950/20" : "border-zinc-800"
               )}
             >
                <div className="flex items-center justify-between gap-3">
                 {/* Left: Avatar and driver info */}
                 <div className="flex items-center gap-3 min-w-0">
                   <div className="flex-shrink-0">
                     <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
                       {driver.name.substring(0, 2).toUpperCase()}
                     </div>
                   </div>
                   <div className="min-w-0">
                     <div className="truncate text-sm font-semibold text-zinc-100">{driver.name}</div>
                     <div className="mt-1 text-xs text-zinc-400">
                       {getDriverTypeLabel(driver.driverType as never)}
                     </div>
                   </div>
                 </div>

                  {/* Right: availability badge and selection indicator */}
                  <div className="ml-auto flex items-center gap-2 pr-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 shrink-0">
                      {driver.availabilityStatus || 'AVAILABLE'}
                    </span>
                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-xs shrink-0",
                      selectedDriver?.id === driver.id ? "border-2 border-amber-500 bg-amber-500 text-white" : "border-2 border-zinc-600"
                    )}>
                      {selectedDriver?.id === driver.id && <span>✓</span>}
                    </div>
                  </div>
               </div>
             </div>
           ))
         )}
       </div>
    </AdminPanel>
  );
}

 function BookingCard({
  booking,
  isSelected = false,
  onClick,
}: {
  booking: SerializedBooking;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-zinc-950/70 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.22)] transition-all duration-200 cursor-pointer",
        isSelected ? "border-amber-500 shadow-[0_12px_30px_rgba(245,158,11,0.24)]" : "border-zinc-800"
      )}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
            <span>🕐</span>
            <span>{formatDate(booking.pickupDateTime)}, {formatTime(booking.pickupDateTime)}</span>
          </div>

          <div className="text-sm font-semibold text-zinc-100 mb-2">
            {booking.pickupLocation} → {booking.dropoffLocation}
          </div>

          <div className="text-xs text-zinc-400 mb-3">
            {booking.fullName} · {booking.phone}
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-3">
            <span>{getCarTypeDisplay(booking.carType)}</span>
            <span>{booking.fareAmount ? formatMoney(booking.fareAmount) : 'Pending'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between">
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
            booking.status === 'CONFIRMED' ? 'bg-orange-500 text-white' :
            booking.status === 'ASSIGNED' ? 'bg-blue-500 text-white' :
            booking.status === 'ACTIVE' ? 'bg-green-500 text-white' :
            'bg-zinc-600 text-zinc-200'
          )}>
            {getBookingStatusLabel(booking.status as never)}
          </span>
          <div className="flex justify-between items-center">
            <button type="button" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded-lg border border-zinc-700 bg-transparent">
              View Details
            </button>
            <button type="button" className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600">
              Assign Driver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
  // function AssignableBookingCard - old complex card implementation
  //   function AssignableBookingCard({
  //   booking,
  //   drivers,
  // }: {
  //   booking: SerializedBooking;
  //   drivers: SerializedDriver[];
  // }) {
  //   const router = useRouter();
  //   const [selectedDriverId, setSelectedDriverId] = useState('');
  //   const [confirmedFare, setConfirmedFare] = useState(booking.fareAmount?.toString() ?? '');
  //   const [outsourcedOpen, setOutsourcedOpen] = useState(false);
  //   const [outsourceVendor, setOutsourceVendor] = useState(booking.manualVendorName ?? '');
  //   const [outsourceDriverName, setOutsourceDriverName] = useState(booking.manualDriverName ?? '');
  //   const [outsourcePhone, setOutsourcePhone] = useState(booking.manualDriverPhone ?? '');
  //   const [outsourceVehicle, setOutsourceVehicle] = useState(booking.manualVehicleDetails ?? '');
  //   const [outsourceCommission, setOutsourceCommission] = useState(booking.commissionAmount?.toString() ?? '');
  //   const [isSaving, setIsSaving] = useState(false);
  // 
  //   async function updateDispatch(payload: Record<string, unknown>) {
  //     setIsSaving(true);
  // 
  //     try {
  //       const response = await fetch(`/api/bookings/${booking.id}/dispatch`, {
  //         method: 'PATCH',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(payload),
  //       });
  // 
  //       const data = await response.json();
  //       if (!response.ok) {
  //         throw new Error(data.error || 'Failed to update dispatch');
  //       }
  // 
  //       router.refresh();
  //     } catch (error) {
  //       alert((error as Error).message);
  //     } finally {
  //       setIsSaving(false);
  //     }
  //   }
  // 
  //   const parsedFare = confirmedFare.trim() === '' ? null : Number(confirmedFare);
  // 
  //   return (
  //     <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
  //       <div className="flex items-start justify-between gap-3">
  //         <div className="min-w-0 flex-1 space-y-2">
  //           <div className="truncate text-sm font-semibold text-zinc-100">{booking.bookingReference}</div>
  //           <div className="truncate text-sm text-zinc-100">{booking.pickupLocation} → {booking.dropoffLocation}</div>
  //           <div className="text-sm text-zinc-300">{booking.fullName} · {booking.phone}</div>
  //           <div className="text-sm text-zinc-500">
  //             {formatDate(booking.pickupDateTime)} · {formatTime(booking.pickupDateTime)} · {getCarTypeDisplay(booking.carType)}
  //           </div>
  //           <div className="text-sm text-zinc-500">
  //             Fare {booking.fareAmount ? formatMoney(booking.fareAmount) : 'Pending'} · {getBookingDisplayAssignee(booking)}
  //           </div>
  //         </div>
  // 
  //         <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', getStatusColor(booking.status))}>
  //           {getBookingStatusLabel(booking.status as never)}
  //         </span>
  //       </div>
  // 
  //       <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
  //         <input
  //           type="number"
  //           min="0"
  //           step="0.01"
  //           value={confirmedFare}
  //           onChange={(event) => setConfirmedFare(event.target.value)}
  //           placeholder="Confirmed fare"
  //           className={adminInputClassName}
  //         />
  //         <div className="flex flex-wrap gap-2">
  //           <button
  //             type="button"
  //             disabled={isSaving}
  //             onClick={() => {
  //               if (parsedFare === null || Number.isNaN(parsedFare)) {
  //                 alert('Enter the confirmed fare first.');
  //                 return;
  //               }
  // 
  //               void updateDispatch({
  //                 fareAmount: parsedFare,
  //                 status: booking.status === 'NEW' ? 'CONFIRMED' : booking.status,
  //               });
  //             }}
  //             className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
  //           >
  //             {booking.status === 'NEW' ? 'Confirm Fare' : 'Save Fare'}
  //           </button>
  // 
  //           {booking.status === 'ASSIGNED' ? (
  //             <button
  //               type="button"
  //               disabled={isSaving}
  //             onClick={() => void updateDispatch({ status: 'ACTIVE' })}
  //             className={adminSecondaryButtonClassName}
  //           >
  //             Start Trip
  //             </button>
  //           ) : null}
  // 
  //            {booking.status === 'ACTIVE' ? (
  //             <button
  //               type="button"
  //               disabled={isSaving}
  //             onClick={() => void updateDispatch({ status: 'COMPLETED' })}
  //             className={adminSecondaryButtonClassName}
  //           >
  //             Complete Trip
  //             </button>
  //           ) : null}
  //         </div>
  //       </div>
  // 
  //       <div className="mt-4 flex flex-col gap-2 sm:flex-row">
  //         <select
  //           value={selectedDriverId}
  //           onChange={(e) => setSelectedDriverId(e.target.value)}
  //           disabled={isSaving || drivers.length === 0}
  //           className={adminInputClassName}
  //         >
  //           <option value="">Choose available driver</option>
  //           {drivers.map((driver) => (
  //             <option key={driver.id} value={driver.id}>
  //                {driver.name}
  //             </option>
  //           ))}
  //         </select>
  // 
  //         <button
  //           type="button"
  //           onClick={() => {
  //             if (!selectedDriverId) return;
  //             void updateDispatch({
  //               driverId: selectedDriverId,
  //               fareAmount: parsedFare,
  //               status: 'ASSIGNED',
  //             });
  //           }}
  //           disabled={isSaving || !selectedDriverId}
  //           className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
  //         >
  //           {isSaving ? 'Assigning...' : 'Assign Driver'}
  //         </button>
  //       </div>
  // 
  //       <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
  //         <div className="flex items-center justify-between gap-3">
  //           <div>
  //             <div className="text-sm font-medium text-zinc-100">Outsourced Driver</div>
  //             <div className="text-xs text-zinc-500">Use this only when the ride is given to an external driver or company.</div>
  //           </div>
  //           <button
  //             type="button"
  //             onClick={() => setOutsourcedOpen((open) => !open)}
  //             className="text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
  //           >
  //             {outsourcedOpen ? 'Hide' : 'Use Outsourced'}
  //           </button>
  //         </div>
  // 
  //         {outsourcedOpen ? (
  //           <div className="mt-4 grid gap-3 md:grid-cols-2">
  //             <input value={outsourceVendor} onChange={(e) => setOutsourceVendor(e.target.value)} placeholder="Vendor / company name" className={adminInputClassName} />
  //             <input value={outsourceDriverName} onChange={(e) => setOutsourceDriverName(e.target.value)} placeholder="Driver name" className={adminInputClassName} />
  //             <input value={outsourcePhone} onChange={(e) => setOutsourcePhone(e.target.value)} placeholder="Phone" className={adminInputClassName} />
  //             <input value={outsourceVehicle} onChange={(e) => setOutsourceVehicle(e.target.value)} placeholder="Vehicle details" className={adminInputClassName} />
  //             <input value={outsourceCommission} onChange={(e) => setOutsourceCommission(e.target.value)} placeholder="Commission" type="number" min="0" step="0.01" className={adminInputClassName} />
  // 
  //             <div className="md:col-span-2 flex justify-end">
  //               <button
  //                 type="button"
  //                 disabled={isSaving}
  //                 onClick={() => {
  //                   if (!outsourceVendor && !outsourceDriverName) {
  //                     alert('Enter vendor or driver details first.');
  //                     return;
  //                   }
  // 
  //                   void updateDispatch({
  //                     fareAmount: parsedFare,
  //                     status: 'ASSIGNED',
  //                     manualVendorName: outsourceVendor || null,
  //                     manualDriverName: outsourceDriverName || null,
  //                     manualDriverPhone: outsourcePhone || null,
  //                     manualVehicleDetails: outsourceVehicle || null,
  //                     commissionAmount: outsourceCommission ? Number(outsourceCommission) : null,
  //                   });
  //                 }}
  //                 className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
  //               >
  //                 Save Outsourced Assignment
  //               </button>
  //             </div>
  //           </div>
  //         ) : null}
  //       </div>
  //     </div>
  //   );
  // }
  // 
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-6 text-sm text-zinc-500">
      {message}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

