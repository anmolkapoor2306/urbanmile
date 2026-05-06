'use client';

import { useMemo, useState } from 'react';
import {
  Car,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  FileWarning,
  LayoutList,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  AdminPanel,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';

type VehicleStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Inactive';
type VehicleAvailability = 'Available' | 'On Trip' | 'On Duty' | 'Off Duty' | 'Unavailable';
type VehicleType = 'Sedan' | 'SUV' | 'MPV' | 'Van';
type DrawerTab = 'Overview' | 'Service History' | 'Insurance' | 'Notes';

type FleetVehicle = {
  id: string;
  type: VehicleType;
  plateNumber: string;
  status: VehicleStatus;
  assignedTo: string;
  availability: VehicleAvailability;
  insuranceExpiry: string;
  lastService: string;
  makeModel: string;
  color: string;
  year: number;
  fuelType: string;
  driverPhone: string;
  vendorSource: string;
  assignedSince: string;
  currentTrip: string;
  startedAt: string;
  serviceHistory: string[];
  insurance: string;
  notes: string;
};

const MOCK_VEHICLES: FleetVehicle[] = [
  {
    id: 'FL-0001',
    type: 'Sedan',
    plateNumber: 'PB 08 DX 1427',
    status: 'Available',
    assignedTo: 'Unassigned',
    availability: 'Available',
    insuranceExpiry: '2026-07-18',
    lastService: '2026-04-12',
    makeModel: 'Maruti Suzuki Dzire',
    color: 'Pearl White',
    year: 2024,
    fuelType: 'Petrol',
    driverPhone: 'Not assigned',
    vendorSource: 'UrbanMiles Private',
    assignedSince: 'Not assigned',
    currentTrip: 'None',
    startedAt: 'Not active',
    serviceHistory: ['Oil and filter replaced on 12 Apr 2026', 'Brake inspection cleared on 03 Mar 2026'],
    insurance: 'Comprehensive policy active until 18 Jul 2026.',
    notes: 'Preferred for airport transfers and city rides.',
  },
  {
    id: 'FL-0002',
    type: 'SUV',
    plateNumber: 'PB 10 HF 8841',
    status: 'Assigned',
    assignedTo: 'Amritpal Singh',
    availability: 'On Trip',
    insuranceExpiry: '2026-05-28',
    lastService: '2026-03-24',
    makeModel: 'Toyota Innova Hycross',
    color: 'Graphite Grey',
    year: 2025,
    fuelType: 'Hybrid',
    driverPhone: '+91 98765 12041',
    vendorSource: 'UrbanMiles Private',
    assignedSince: '2026-04-22',
    currentTrip: 'Jalandhar to Delhi City',
    startedAt: 'Today, 07:40 AM',
    serviceHistory: ['Tyre rotation completed on 24 Mar 2026', 'AC service completed on 18 Feb 2026'],
    insurance: 'Insurance renewal due soon. Documents verified.',
    notes: 'Keep stocked with water bottles for long routes.',
  },
  {
    id: 'FL-0003',
    type: 'MPV',
    plateNumber: 'PB 02 EL 7190',
    status: 'Maintenance',
    assignedTo: 'Garage Hold',
    availability: 'Unavailable',
    insuranceExpiry: '2026-09-02',
    lastService: '2026-05-01',
    makeModel: 'Kia Carens',
    color: 'Imperial Blue',
    year: 2023,
    fuelType: 'Diesel',
    driverPhone: 'Not assigned',
    vendorSource: 'UrbanMiles Private',
    assignedSince: 'Not assigned',
    currentTrip: 'None',
    startedAt: 'Not active',
    serviceHistory: ['Suspension check opened on 01 May 2026', 'Battery replaced on 15 Jan 2026'],
    insurance: 'Comprehensive policy active until 02 Sep 2026.',
    notes: 'Awaiting rear suspension inspection report.',
  },
  {
    id: 'FL-0004',
    type: 'Van',
    plateNumber: 'PB 11 CK 3065',
    status: 'Available',
    assignedTo: 'Baljinder Singh',
    availability: 'On Duty',
    insuranceExpiry: '2026-06-09',
    lastService: '2026-04-21',
    makeModel: 'Force Urbania',
    color: 'Silver',
    year: 2024,
    fuelType: 'Diesel',
    driverPhone: '+91 98765 98420',
    vendorSource: 'UrbanMiles Private',
    assignedSince: '2026-04-05',
    currentTrip: 'None',
    startedAt: 'On duty since 08:15 AM',
    serviceHistory: ['Routine service completed on 21 Apr 2026', 'Wheel alignment completed on 11 Mar 2026'],
    insurance: 'Insurance renewal due in June.',
    notes: 'Best for group pickups and corporate runs.',
  },
  {
    id: 'FL-0005',
    type: 'Sedan',
    plateNumber: 'PB 08 FG 5522',
    status: 'Assigned',
    assignedTo: 'Harpreet Kaur',
    availability: 'On Trip',
    insuranceExpiry: '2026-11-16',
    lastService: '2026-04-02',
    makeModel: 'Honda City',
    color: 'Metallic Brown',
    year: 2022,
    fuelType: 'Petrol',
    driverPhone: '+91 98765 44190',
    vendorSource: 'UrbanMiles Private',
    assignedSince: '2026-03-29',
    currentTrip: 'Amritsar to Jalandhar',
    startedAt: 'Today, 10:05 AM',
    serviceHistory: ['Full inspection completed on 02 Apr 2026', 'New wipers installed on 14 Feb 2026'],
    insurance: 'Comprehensive policy active until 16 Nov 2026.',
    notes: 'Interior deep clean due next week.',
  },
  {
    id: 'FL-0006',
    type: 'SUV',
    plateNumber: 'CH 01 BW 9184',
    status: 'Inactive',
    assignedTo: 'Unassigned',
    availability: 'Off Duty',
    insuranceExpiry: '2026-05-19',
    lastService: '2026-02-18',
    makeModel: 'Mahindra Scorpio N',
    color: 'Napoli Black',
    year: 2023,
    fuelType: 'Diesel',
    driverPhone: 'Not assigned',
    vendorSource: 'UrbanMiles Private',
    assignedSince: 'Not assigned',
    currentTrip: 'None',
    startedAt: 'Not active',
    serviceHistory: ['Service completed on 18 Feb 2026', 'Emission check completed on 07 Feb 2026'],
    insurance: 'Insurance expires soon. Renewal pending.',
    notes: 'Inactive until insurance renewal is complete.',
  },
  {
    id: 'FL-0007',
    type: 'MPV',
    plateNumber: 'PB 07 DC 6408',
    status: 'Available',
    assignedTo: 'Gurpreet Gill',
    availability: 'Available',
    insuranceExpiry: '2026-08-24',
    lastService: '2026-04-16',
    makeModel: 'Maruti Suzuki Ertiga',
    color: 'Arctic White',
    year: 2024,
    fuelType: 'CNG',
    driverPhone: '+91 98765 66318',
    vendorSource: 'UrbanMiles Private',
    assignedSince: '2026-04-10',
    currentTrip: 'None',
    startedAt: 'Available since 09:00 AM',
    serviceHistory: ['CNG inspection cleared on 16 Apr 2026', 'Cabin filter replaced on 22 Mar 2026'],
    insurance: 'Comprehensive policy active until 24 Aug 2026.',
    notes: 'High efficiency vehicle for Ludhiana and Chandigarh routes.',
  },
  {
    id: 'FL-0008',
    type: 'Van',
    plateNumber: 'PB 08 HV 2901',
    status: 'Maintenance',
    assignedTo: 'Garage Hold',
    availability: 'Unavailable',
    insuranceExpiry: '2027-01-12',
    lastService: '2026-05-03',
    makeModel: 'Tempo Traveller 12 Seater',
    color: 'White',
    year: 2021,
    fuelType: 'Diesel',
    driverPhone: 'Not assigned',
    vendorSource: 'UrbanMiles Private',
    assignedSince: 'Not assigned',
    currentTrip: 'None',
    startedAt: 'Not active',
    serviceHistory: ['Clutch work opened on 03 May 2026', 'Tyre replacement completed on 10 Apr 2026'],
    insurance: 'Comprehensive policy active until 12 Jan 2027.',
    notes: 'Hold for weekend group bookings after maintenance clearance.',
  },
];

const STATUS_OPTIONS: VehicleStatus[] = ['Available', 'Assigned', 'Maintenance', 'Inactive'];
const TYPE_OPTIONS: VehicleType[] = ['Sedan', 'SUV', 'MPV', 'Van'];
const AVAILABILITY_OPTIONS: VehicleAvailability[] = ['Available', 'On Trip', 'On Duty', 'Off Duty', 'Unavailable'];
const DRAWER_TABS: DrawerTab[] = ['Overview', 'Service History', 'Insurance', 'Notes'];

export function FleetManagementClient() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>('Overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return MOCK_VEHICLES.filter((vehicle) => {
      const matchesQuery =
        !normalizedQuery ||
        vehicle.id.toLowerCase().includes(normalizedQuery) ||
        vehicle.plateNumber.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'All' || vehicle.status === statusFilter;
      const matchesType = typeFilter === 'All' || vehicle.type === typeFilter;
      const matchesAvailability = availabilityFilter === 'All' || vehicle.availability === availabilityFilter;

      return matchesQuery && matchesStatus && matchesType && matchesAvailability;
    });
  }, [availabilityFilter, query, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const insuranceCutoff = new Date();
    insuranceCutoff.setDate(insuranceCutoff.getDate() + 45);

    return {
      total: MOCK_VEHICLES.length,
      available: MOCK_VEHICLES.filter((vehicle) => vehicle.status === 'Available').length,
      assigned: MOCK_VEHICLES.filter((vehicle) => vehicle.status === 'Assigned').length,
      maintenance: MOCK_VEHICLES.filter((vehicle) => vehicle.status === 'Maintenance').length,
      insuranceExpiring: MOCK_VEHICLES.filter((vehicle) => new Date(vehicle.insuranceExpiry) <= insuranceCutoff).length,
    };
  }, []);

  function resetFilters() {
    setQuery('');
    setStatusFilter('All');
    setTypeFilter('All');
    setAvailabilityFilter('All');
  }

  function selectVehicle(vehicle: FleetVehicle) {
    setSelectedVehicle(vehicle);
    setActiveTab('Overview');
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Fleet</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage private fleet vehicles, their status, and assignments.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className={cn(adminSecondaryButtonClassName, 'inline-flex items-center gap-2')}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import Vehicles
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Vehicle
          </button>
        </div>
      </header>

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-5">
        <FleetStatCard label="Total Vehicles" value={stats.total} icon={Car} tone="default" />
        <FleetStatCard label="Available" value={stats.available} icon={CheckCircle2} tone="green" />
        <FleetStatCard label="Assigned" value={stats.assigned} icon={CircleDot} tone="yellow" />
        <FleetStatCard label="Maintenance" value={stats.maintenance} icon={Wrench} tone="red" />
        <FleetStatCard label="Insurance Expiring" value={stats.insuranceExpiring} icon={FileWarning} tone="amber" />
      </section>

      <AdminPanel className="shrink-0 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,0.8fr))_auto_auto_auto] lg:items-center">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by vehicle ID or plate number"
              className={cn(adminInputClassName, 'pl-10')}
            />
          </label>
          <FleetSelect label="Status" value={statusFilter} options={['All', ...STATUS_OPTIONS]} onChange={setStatusFilter} />
          <FleetSelect label="Vehicle Type" value={typeFilter} options={['All', ...TYPE_OPTIONS]} onChange={setTypeFilter} />
          <FleetSelect label="Availability" value={availabilityFilter} options={['All', ...AVAILABILITY_OPTIONS]} onChange={setAvailabilityFilter} />
          <button type="button" onClick={resetFilters} className={cn(adminSecondaryButtonClassName, 'inline-flex items-center justify-center gap-2')}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
          <div className="whitespace-nowrap text-sm font-bold text-zinc-600 dark:text-zinc-400">{filteredVehicles.length} vehicles</div>
          <button
            type="button"
            aria-label="Compact list view"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LayoutList className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </AdminPanel>

      <div className={cn('grid min-h-0 min-w-0 flex-1 gap-4 overflow-hidden', selectedVehicle ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1')}>
        <AdminPanel className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <FleetTable vehicles={filteredVehicles} selectedVehicle={selectedVehicle} onSelectVehicle={selectVehicle} />
          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-4 py-3 text-xs font-bold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredVehicles.length ? 1 : 0}-{filteredVehicles.length} of {filteredVehicles.length} vehicles
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                Previous
              </button>
              <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-zinc-950">1</span>
              <button type="button" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                Next
              </button>
            </div>
          </div>
        </AdminPanel>

        {selectedVehicle ? (
          <VehicleDetailDrawer
            vehicle={selectedVehicle}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onClose={() => setSelectedVehicle(null)}
          />
        ) : null}
      </div>

      {isAddModalOpen ? <AddVehiclePlaceholder onClose={() => setIsAddModalOpen(false)} /> : null}
    </div>
  );
}

function FleetStatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Car;
  tone: 'default' | 'green' | 'yellow' | 'red' | 'amber';
}) {
  return (
    <AdminPanel className="flex min-h-[86px] items-center gap-3 p-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', statIconClass(tone))}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="mt-1 text-2xl font-black text-zinc-950 dark:text-white">{value}</div>
      </div>
    </AdminPanel>
  );
}

function FleetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(adminInputClassName, 'appearance-none pr-10 font-semibold')}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'All' ? label : option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
    </label>
  );
}

function FleetTable({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
}: {
  vehicles: FleetVehicle[];
  selectedVehicle: FleetVehicle | null;
  onSelectVehicle: (vehicle: FleetVehicle) => void;
}) {
  return (
    <div className="dashboard-scrollbar min-h-0 flex-1 overflow-auto">
      <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
          <tr className="text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {['Vehicle ID', 'Vehicle', 'Type', 'Plate Number', 'Status', 'Assigned To', 'Availability', 'Insurance Expiry', 'Last Service', 'Actions'].map((heading) => (
              <th key={heading} className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                No private fleet vehicles match the current filters.
              </td>
            </tr>
          ) : (
            vehicles.map((vehicle) => (
              <tr
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle)}
                className={cn(
                  'cursor-pointer border-b border-zinc-200 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900',
                  selectedVehicle?.id === vehicle.id && 'bg-amber-50/70 dark:bg-amber-400/10'
                )}
              >
                <td className="border-b border-zinc-200 px-4 py-3 font-black text-zinc-950 dark:border-zinc-800 dark:text-white">{vehicle.id}</td>
                <td className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <VehicleAvatar type={vehicle.type} />
                </td>
                <td className="border-b border-zinc-200 px-4 py-3 font-bold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">{vehicle.type}</td>
                <td className="border-b border-zinc-200 px-4 py-3 font-bold text-zinc-950 dark:border-zinc-800 dark:text-white">{vehicle.plateNumber}</td>
                <td className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <StatusPill status={vehicle.status} />
                </td>
                <td className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{vehicle.assignedTo}</td>
                <td className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">{vehicle.availability}</td>
                <td className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{formatDate(vehicle.insuranceExpiry)}</td>
                <td className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{formatDate(vehicle.lastService)}</td>
                <td className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Actions for ${vehicle.id}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function VehicleDetailDrawer({
  vehicle,
  activeTab,
  onChangeTab,
  onClose,
}: {
  vehicle: FleetVehicle;
  activeTab: DrawerTab;
  onChangeTab: (tab: DrawerTab) => void;
  onClose: () => void;
}) {
  return (
    <AdminPanel className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <VehicleAvatar type={vehicle.type} large />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black text-zinc-950 dark:text-white">{vehicle.id}</h2>
              <StatusPill status={vehicle.status} />
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {vehicle.plateNumber} - {vehicle.type}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close vehicle details"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="shrink-0 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="dashboard-scrollbar flex gap-2 overflow-x-auto py-3">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChangeTab(tab)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition-colors',
                activeTab === tab
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === 'Overview' ? <OverviewTab vehicle={vehicle} /> : null}
        {activeTab === 'Service History' ? <SimpleTab title="Service History" items={vehicle.serviceHistory} icon={Wrench} /> : null}
        {activeTab === 'Insurance' ? <SimpleTab title="Insurance" items={[vehicle.insurance, `Expiry: ${formatDate(vehicle.insuranceExpiry)}`]} icon={ShieldCheck} /> : null}
        {activeTab === 'Notes' ? <SimpleTab title="Notes" items={[vehicle.notes]} icon={FileWarning} /> : null}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
        <button type="button" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-black text-red-700 transition-colors hover:bg-red-500/15 dark:text-red-200">
          Mark Maintenance
        </button>
        <button type="button" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
          Deactivate Vehicle
        </button>
      </div>
    </AdminPanel>
  );
}

function OverviewTab({ vehicle }: { vehicle: FleetVehicle }) {
  return (
    <div className="space-y-4">
      <DetailSection
        title="Vehicle Information"
        icon={Car}
        rows={[
          ['Vehicle ID', vehicle.id],
          ['Type', vehicle.type],
          ['Make / Model', vehicle.makeModel],
          ['Color', vehicle.color],
          ['Year', String(vehicle.year)],
          ['Fuel Type', vehicle.fuelType],
        ]}
      />
      <DetailSection
        title="Assignment"
        icon={UserRound}
        rows={[
          ['Assigned To', vehicle.assignedTo],
          ['Driver Phone', vehicle.driverPhone],
          ['Vendor/Source', vehicle.vendorSource],
          ['Since', vehicle.assignedSince],
        ]}
      />
      <DetailSection
        title="Availability"
        icon={Clock3}
        rows={[
          ['Status', vehicle.status],
          ['Availability', vehicle.availability],
          ['Current Trip', vehicle.currentTrip],
          ['Started At', vehicle.startedAt],
        ]}
      />
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof Car;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-white">
        <Icon className="h-4 w-4 text-amber-500" aria-hidden="true" />
        {title}
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="min-w-0 break-words font-bold text-zinc-800 dark:text-zinc-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleTab({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: typeof Car;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-white">
        <Icon className="h-4 w-4 text-amber-500" aria-hidden="true" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function VehicleAvatar({ type, large = false }: { type: VehicleType; large?: boolean }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200', large ? 'h-14 w-14' : 'h-10 w-10')}>
      {type === 'Van' ? <LayoutList className={cn(large ? 'h-6 w-6' : 'h-5 w-5')} aria-hidden="true" /> : <Car className={cn(large ? 'h-6 w-6' : 'h-5 w-5')} aria-hidden="true" />}
    </div>
  );
}

function StatusPill({ status }: { status: VehicleStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-black leading-none', statusClass(status))}>{status}</span>;
}

function AddVehiclePlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">Add Vehicle</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Vehicle creation form placeholder for the private fleet module.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 p-2 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300">
          Done
        </button>
      </div>
    </div>
  );
}

function statIconClass(tone: 'default' | 'green' | 'yellow' | 'red' | 'amber') {
  if (tone === 'green') return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300';
  if (tone === 'yellow') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-200';
  if (tone === 'red') return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';
}

function statusClass(status: VehicleStatus) {
  if (status === 'Available') return 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200';
  if (status === 'Assigned') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-200';
  if (status === 'Maintenance') return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200';
  return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
