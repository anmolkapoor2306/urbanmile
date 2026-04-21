export const BOOKING_STATUSES = ['NEW', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const DRIVER_TYPES = ['OWN', 'THIRD_PARTY', 'VENDOR'] as const;
export const PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID'] as const;
export const ASSIGNMENT_TYPES = ['OWN_DRIVER', 'OUTSOURCED_DRIVER', 'MANUAL_OUTSOURCED'] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];
export type DriverTypeValue = (typeof DRIVER_TYPES)[number];
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];
export type AssignmentTypeValue = (typeof ASSIGNMENT_TYPES)[number];

export const dispatchGroups: Array<{
  key: BookingStatusValue;
  title: string;
}> = [
  { key: 'NEW', title: 'New Requests' },
  { key: 'CONFIRMED', title: 'Confirmed' },
  { key: 'ASSIGNED', title: 'Assigned / Upcoming' },
  { key: 'IN_PROGRESS', title: 'Active' },
  { key: 'COMPLETED', title: 'Completed' },
  { key: 'CANCELLED', title: 'Cancelled' },
];

export function getBookingStatusLabel(status: BookingStatusValue): string {
  const labelMap: Record<BookingStatusValue, string> = {
    NEW: 'New',
    CONFIRMED: 'Confirmed',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'Active',
    COMPLETED: 'Complete',
    CANCELLED: 'Cancelled',
  };
  return labelMap[status];
}

export function getDriverTypeLabel(driverType: DriverTypeValue): string {
  const labelMap: Record<DriverTypeValue, string> = {
    OWN: 'Own Driver',
    THIRD_PARTY: 'Third Party Driver',
    VENDOR: 'Vendor / Company',
  };

  return labelMap[driverType];
}

export function getPaymentStatusLabel(status: PaymentStatusValue): string {
  const labelMap: Record<PaymentStatusValue, string> = {
    UNPAID: 'Unpaid',
    PARTIAL: 'Partially Paid',
    PAID: 'Paid',
  };

  return labelMap[status];
}

export function getAssignmentTypeLabel(type: AssignmentTypeValue): string {
  const labelMap: Record<AssignmentTypeValue, string> = {
    OWN_DRIVER: 'Own Driver',
    OUTSOURCED_DRIVER: 'Outsourced Driver',
    MANUAL_OUTSOURCED: 'Manual Outsourced',
  };

  return labelMap[type];
}
