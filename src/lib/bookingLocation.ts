import { z } from 'zod';

export const bookingLocationSourceSchema = z.enum(['manual', 'current-location']);

export const bookingLocationMetadataSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  placeId: z.string().trim().optional(),
  source: bookingLocationSourceSchema.optional(),
});

export type BookingLocationMetadata = z.infer<typeof bookingLocationMetadataSchema>;
export type BookingLocationSource = z.infer<typeof bookingLocationSourceSchema>;

export function createEmptyLocationMetadata(): BookingLocationMetadata {
  return {
    latitude: null,
    longitude: null,
    placeId: '',
    source: 'manual',
  };
}

export function getLocationUpgradeHint(type: 'pickup' | 'dropoff'): string {
  if (type === 'pickup') {
    return 'Use Current Location fills your pickup with your device coordinates when permission is granted.';
  }

  return 'Enter the drop location manually for now.';
}
