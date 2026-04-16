'use client';

import { useState } from 'react';
import {
  createEmptyLocationMetadata,
  type BookingLocationMetadata,
  type BookingLocationSource,
} from '@/lib/bookingLocation';

export function useBookingLocationField(initialAddress = '') {
  const [address, setAddress] = useState(initialAddress);
  const [metadata, setMetadata] = useState<BookingLocationMetadata>(createEmptyLocationMetadata());

  const updateAddress = (nextAddress: string) => {
    setAddress(nextAddress);
    setMetadata((previous) => ({
      ...previous,
      latitude: null,
      longitude: null,
      placeId: '',
      source: 'manual',
    }));
  };

  const setResolvedLocation = (
    nextAddress: string,
    nextMetadata: Omit<BookingLocationMetadata, 'source'> & { source?: BookingLocationSource }
  ) => {
    setAddress(nextAddress);
    setMetadata({
      latitude: nextMetadata.latitude ?? null,
      longitude: nextMetadata.longitude ?? null,
      placeId: nextMetadata.placeId ?? '',
      source: nextMetadata.source ?? 'current-location',
    });
  };

  const markCurrentLocationRequested = () => {
    setMetadata((previous) => ({
      ...previous,
      source: 'current-location',
    }));
  };

  const reset = () => {
    setAddress('');
    setMetadata(createEmptyLocationMetadata());
  };

  return {
    address,
    metadata,
    updateAddress,
    setResolvedLocation,
    markCurrentLocationRequested,
    reset,
  };
}
