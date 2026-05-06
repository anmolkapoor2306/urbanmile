'use client';

import { useState, FormEvent, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  Car,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { CONTACT_PHONE_HREF } from '@/lib/contact';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';
import { useBookingLocationField } from '@/hooks/useBookingLocationField';
import {
  getFixedCitySuggestions,
  getFixedRoutePrice,
  type FixedRoutePrice,
} from '@/lib/fixedRoutePricing';

const UNAVAILABLE_ROUTE_MESSAGE = 'Price not available for this route yet. Call support or try later.';
const GOOGLE_BOOKING_DRAFT_KEY = 'urbanmiles_google_booking_draft';
const RIDE_OPTIONS_DRAFT_KEY = 'urbanmiles_ride_options_draft';
const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val !== undefined, {
    message: 'Please select a vehicle type',
  }),
  fareAmount: z.number().positive().optional(),
  specialInstructions: z.string().optional(),
  pickupLatitude: bookingLocationMetadataSchema.shape.latitude,
  pickupLongitude: bookingLocationMetadataSchema.shape.longitude,
  pickupPlaceId: bookingLocationMetadataSchema.shape.placeId,
  pickupLocationSource: bookingLocationMetadataSchema.shape.source,
  dropoffLatitude: bookingLocationMetadataSchema.shape.latitude,
  dropoffLongitude: bookingLocationMetadataSchema.shape.longitude,
  dropoffPlaceId: bookingLocationMetadataSchema.shape.placeId,
  dropoffLocationSource: bookingLocationMetadataSchema.shape.source,
});

type BookingFormData = z.infer<typeof bookingSchema>;
type BookingMode = 'ONE_WAY' | 'ROUND_TRIP';
type PickupTiming = 'NOW' | 'LATER';
type RideOption = 'SEDAN' | 'VAN';
type LocationFieldName = 'pickupLocation' | 'dropoffLocation';
type BookingErrorField = keyof BookingFormData | 'returnDateTime';
type BookingAuthProvider = 'google' | 'phone_guest';
type BookingAuthStep = 'choice' | 'otp' | 'ready';
type AddressSuggestion = {
  id: string;
  formatted: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  addressLine1: string;
  addressLine2: string;
};
type GeoapifyAutocompleteResult = {
  formatted?: string;
  lat?: number;
  lon?: number;
  place_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
};
type GeoapifyAutocompleteResponse = {
  results?: GeoapifyAutocompleteResult[];
};
type BookingResponseItem = {
  bookingReference?: string;
  publicBookingId?: string;
  customerPublicId?: string | null;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: string;
  carType?: string;
};
type RoutePreviewState = {
  distanceKm: number | null;
  durationMinutes: number | null;
  isLoading: boolean;
  error: string | null;
};
type RideOptionsDraft = {
  formData: BookingFormData;
  bookingMode: BookingMode;
  pickupTiming: PickupTiming;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  selectedRide: RideOption;
  priceQuote: FixedRoutePrice;
};

type CustomerProfile = {
  fullName: string;
  email: string;
  emailVerified: boolean;
  supabaseUserId: string;
};

interface BookingFormProps {
  onBookingSuccess?: () => void;
  onReset?: () => void;
  mode?: 'search' | 'ride-options';
}

export function BookingForm({ onBookingSuccess, onReset, mode = 'search' }: BookingFormProps) {
  const router = useRouter();
  const isRideOptionsPage = mode === 'ride-options';
  const [isSuccess, setIsSuccess] = useState(false);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const pickupTimingMenuRef = useRef<HTMLDivElement>(null);
  const pickupField = useBookingLocationField();
  const dropoffField = useBookingLocationField();
  const [bookingMode, setBookingMode] = useState<BookingMode>('ONE_WAY');
  const [pickupTiming, setPickupTiming] = useState<PickupTiming>('NOW');
  const [isPickupTimingOpen, setIsPickupTimingOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [priceQuote, setPriceQuote] = useState<FixedRoutePrice | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption>('SEDAN');
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [activeLocationField, setActiveLocationField] = useState<LocationFieldName | null>(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [addressSuggestions, setAddressSuggestions] = useState<Record<LocationFieldName, AddressSuggestion[]>>({
    pickupLocation: [],
    dropoffLocation: [],
  });
  const [isAddressLoading, setIsAddressLoading] = useState<Record<LocationFieldName, boolean>>({
    pickupLocation: false,
    dropoffLocation: false,
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingReferences, setBookingReferences] = useState<string[]>([]);
  const [createdBookingDetails, setCreatedBookingDetails] = useState<BookingResponseItem[]>([]);
  const [authProvider, setAuthProvider] = useState<BookingAuthProvider>('phone_guest');
  const [authStep, setAuthStep] = useState<BookingAuthStep>('otp');
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendSeconds, setOtpResendSeconds] = useState(0);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>({
    fullName: '',
    email: '',
    emailVerified: false,
    supabaseUserId: '',
  });
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof CustomerProfile, string>>>({});

  const [formData, setFormData] = useState<BookingFormData>({
    bookingType: 'PERSONAL',
    fullName: '',
    email: '',
    phone: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: '',
    carType: 'SEDAN',
    fareAmount: undefined,
    specialInstructions: '',
    pickupLatitude: null,
    pickupLongitude: null,
    pickupPlaceId: '',
    pickupLocationSource: 'manual',
    dropoffLatitude: null,
    dropoffLongitude: null,
    dropoffPlaceId: '',
    dropoffLocationSource: 'manual',
  });
  const [errors, setErrors] = useState<Partial<Record<BookingErrorField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);
  const [pickupLocationError, setPickupLocationError] = useState<string | null>(null);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);

  const finalPrice = priceQuote ? getRideFare(priceQuote, selectedRide) : 0;
  const totalPrice = bookingMode === 'ROUND_TRIP' ? finalPrice * 2 : finalPrice;
  const returnDateTime = buildPickupDateTime(returnDate, returnTime);
  const isRouteUnavailable = routeMessage === UNAVAILABLE_ROUTE_MESSAGE;
  const activeLocationValue =
    activeLocationField === 'pickupLocation'
      ? pickupField.address
      : activeLocationField === 'dropoffLocation'
        ? dropoffField.address
        : '';
  const activeLocationSuggestions = activeLocationField
    ? addressSuggestions[activeLocationField]
    : [];
  const rideOptions = useMemo(() => buildRideOptions(priceQuote), [priceQuote]);
  const pickupDisplayTime =
    pickupTiming === 'NOW'
      ? 'Pickup now'
      : formData.pickupDateTime
        ? formatPickupDateTime(formData.pickupDateTime)
        : 'Scheduled time pending';

  const handleRideSelect = (nextRide: RideOption) => {
    if (!priceQuote) {
      return;
    }

    const nextFare = getRideFare(priceQuote, nextRide);
    setSelectedRide(nextRide);
    setFormData((prev) => ({
      ...prev,
      carType: nextRide,
      fareAmount: nextFare,
    }));
  };

  const openRideOptionsPage = (draft: RideOptionsDraft) => {
    window.sessionStorage.setItem(RIDE_OPTIONS_DRAFT_KEY, JSON.stringify(draft));
    router.push('/choose-ride');
  };

  useEffect(() => {
    if (!isRideOptionsPage) {
      return;
    }

    const savedDraft = window.sessionStorage.getItem(RIDE_OPTIONS_DRAFT_KEY);
    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Partial<RideOptionsDraft>;
      if (!parsed.formData || !parsed.priceQuote) {
        return;
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(parsed.formData);
      pickupField.setResolvedLocation(parsed.formData.pickupLocation, {
        latitude: parsed.formData.pickupLatitude ?? null,
        longitude: parsed.formData.pickupLongitude ?? null,
        placeId: parsed.formData.pickupPlaceId,
        source: parsed.formData.pickupLocationSource ?? 'manual',
      });
      dropoffField.setResolvedLocation(parsed.formData.dropoffLocation, {
        latitude: parsed.formData.dropoffLatitude ?? null,
        longitude: parsed.formData.dropoffLongitude ?? null,
        placeId: parsed.formData.dropoffPlaceId,
        source: parsed.formData.dropoffLocationSource ?? 'manual',
      });
      setBookingMode(parsed.bookingMode ?? 'ONE_WAY');
      setPickupTiming(parsed.pickupTiming ?? 'NOW');
      setPickupDate(parsed.pickupDate ?? '');
      setPickupTime(parsed.pickupTime ?? '');
      setReturnDate(parsed.returnDate ?? '');
      setReturnTime(parsed.returnTime ?? '');
      setSelectedRide(parsed.selectedRide === 'VAN' ? 'VAN' : 'SEDAN');
      setPriceQuote(parsed.priceQuote);
    } catch {
      window.sessionStorage.removeItem(RIDE_OPTIONS_DRAFT_KEY);
    }
    // The location field helpers are stable for the lifetime of this mounted booking flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRideOptionsPage]);

  useEffect(() => {
    if (!activeLocationField) {
      return;
    }

    const fieldName = activeLocationField;
    const query = activeLocationValue.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const debounceTimer = window.setTimeout(async () => {
      setIsAddressLoading((prev) => ({ ...prev, [fieldName]: true }));

      try {
        const suggestions = GEOAPIFY_API_KEY
          ? await fetchGeoapifyAddressSuggestions(query, controller.signal)
          : getFixedCitySuggestions(query).slice(0, 8).map(createManualAddressSuggestion);

        setAddressSuggestions((prev) => ({ ...prev, [fieldName]: suggestions }));
        setHighlightedSuggestionIndex(0);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAddressSuggestions((prev) => ({ ...prev, [fieldName]: [] }));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressLoading((prev) => ({ ...prev, [fieldName]: false }));
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(debounceTimer);
    };
  }, [activeLocationField, activeLocationValue]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBookingError(null);

    if (name === 'pickup_location_field') {
      pickupField.updateAddress(value);
      setPickupLocationError(null);
      setRouteMessage(null);
      setPriceQuote(null);
      setFormData((prev) => ({
        ...prev,
        pickupLocation: value,
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
      }));
    } else if (name === 'dropoff_location_field') {
      dropoffField.updateAddress(value);
      setRouteMessage(null);
      setPriceQuote(null);
      setFormData((prev) => ({
        ...prev,
        dropoffLocation: value,
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
    } else if (name === 'pickupDate') {
      setPickupDate(value);
      setFormData((prev) => ({ ...prev, pickupDateTime: buildPickupDateTime(value, pickupTime) }));
    } else if (name === 'pickupTime') {
      setPickupTime(value);
      setFormData((prev) => ({ ...prev, pickupDateTime: buildPickupDateTime(pickupDate, value) }));
    } else if (name === 'returnDate') {
      setReturnDate(value);
    } else if (name === 'returnTime') {
      setReturnTime(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    const errorName =
      name === 'pickup_location_field'
        ? 'pickupLocation'
        : name === 'dropoff_location_field'
          ? 'dropoffLocation'
          : name === 'pickupDate' || name === 'pickupTime'
            ? 'pickupDateTime'
            : name === 'returnDate' || name === 'returnTime'
              ? 'returnDateTime'
              : name;

    if (errors[errorName as BookingErrorField]) {
      setErrors((prev) => ({ ...prev, [errorName]: undefined }));
    }

    if (name === 'pickup_location_field' || name === 'dropoff_location_field') {
      const fieldName = name === 'pickup_location_field' ? 'pickupLocation' : 'dropoffLocation';
      setActiveLocationField(fieldName);
      setHighlightedSuggestionIndex(0);
      if (value.trim().length < 2) {
        setAddressSuggestions((prev) => ({ ...prev, [fieldName]: [] }));
        setIsAddressLoading((prev) => ({ ...prev, [fieldName]: false }));
      }
    }
  };

  const handleLocationSuggestionSelect = (fieldName: LocationFieldName, suggestion: AddressSuggestion) => {
    const formattedAddress = suggestion.formatted;

    if (fieldName === 'pickupLocation') {
      pickupField.setResolvedLocation(formattedAddress, {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        placeId: suggestion.placeId,
        source: 'manual',
      });
      setPickupLocationError(null);
      setFormData((prev) => ({
        ...prev,
        pickupLocation: formattedAddress,
        pickupLatitude: suggestion.latitude,
        pickupLongitude: suggestion.longitude,
        pickupPlaceId: suggestion.placeId,
        pickupLocationSource: 'manual',
      }));
    } else {
      dropoffField.setResolvedLocation(formattedAddress, {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        placeId: suggestion.placeId,
        source: 'manual',
      });
      setFormData((prev) => ({
        ...prev,
        dropoffLocation: formattedAddress,
        dropoffLatitude: suggestion.latitude,
        dropoffLongitude: suggestion.longitude,
        dropoffPlaceId: suggestion.placeId,
        dropoffLocationSource: 'manual',
      }));
    }

    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    setRouteMessage(null);
    setPriceQuote(null);
    setActiveLocationField(null);
    setHighlightedSuggestionIndex(0);
    setAddressSuggestions((prev) => ({ ...prev, [fieldName]: [] }));
  };

  const handleLocationFieldKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    fieldName: LocationFieldName
  ) => {
    if (activeLocationField !== fieldName || activeLocationSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((index) => (index + 1) % activeLocationSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((index) =>
        index === 0 ? activeLocationSuggestions.length - 1 : index - 1
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selectedSuggestion = activeLocationSuggestions[highlightedSuggestionIndex];
      if (selectedSuggestion) {
        handleLocationSuggestionSelect(fieldName, selectedSuggestion);
      }
    } else if (event.key === 'Escape') {
      setActiveLocationField(null);
    }
  };

  const handlePickupTimingChange = (value: PickupTiming) => {
    setPickupTiming(value);
    setIsPickupTimingOpen(false);
    setFormData((prev) => ({
      ...prev,
      pickupDateTime: value === 'NOW' ? '' : prev.pickupDateTime,
    }));

    if (value === 'NOW') {
      setErrors((prev) => ({ ...prev, pickupDateTime: undefined }));
    }
  };

  useEffect(() => {
    if (!isPickupTimingOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (
        pickupTimingMenuRef.current &&
        !pickupTimingMenuRef.current.contains(event.target as Node)
      ) {
        setIsPickupTimingOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickupTimingOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isPickupTimingOpen]);

  useEffect(() => {
    if (isSuccess && confirmationRef.current) {
      setTimeout(() => {
        confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (otpResendSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOtpResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpResendSeconds]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');

    if (!accessToken || !window.location.search.includes('auth=google')) {
      return;
    }

    const draft = window.localStorage.getItem(GOOGLE_BOOKING_DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as {
          formData?: BookingFormData;
          bookingMode?: BookingMode;
          pickupTiming?: PickupTiming;
          pickupDate?: string;
          pickupTime?: string;
          returnDate?: string;
          returnTime?: string;
          selectedRide?: RideOption;
          priceQuote?: FixedRoutePrice;
        };

        if (parsed.formData) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFormData(parsed.formData);
          pickupField.updateAddress(parsed.formData.pickupLocation);
          dropoffField.updateAddress(parsed.formData.dropoffLocation);
        }
        if (parsed.bookingMode) setBookingMode(parsed.bookingMode);
        if (parsed.pickupTiming) setPickupTiming(parsed.pickupTiming);
        if (parsed.pickupDate) setPickupDate(parsed.pickupDate);
        if (parsed.pickupTime) setPickupTime(parsed.pickupTime);
        if (parsed.returnDate) setReturnDate(parsed.returnDate);
        if (parsed.returnTime) setReturnTime(parsed.returnTime);
        if (parsed.selectedRide) setSelectedRide(parsed.selectedRide);
        if (parsed.priceQuote) setPriceQuote(parsed.priceQuote);
      } catch {
        window.localStorage.removeItem(GOOGLE_BOOKING_DRAFT_KEY);
      }
    }

    const loadGoogleProfile = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setAuthError('Google sign-in is not configured yet. Continue as guest for now.');
        return;
      }

      try {
        const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
          headers: {
            apikey: supabaseAnonKey,
            authorization: `Bearer ${accessToken}`,
          },
        });
        const user = await response.json();

        if (!response.ok) {
          throw new Error('Unable to load Google profile');
        }

        setAuthProvider('google');
        setAuthStep('otp');
        setCustomerProfile((prev) => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || prev.fullName,
          email: user.email || prev.email,
          emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at || user.email),
          supabaseUserId: user.id || '',
        }));
        setFormData((prev) => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || prev.fullName,
          email: user.email || prev.email,
        }));
        window.localStorage.removeItem(GOOGLE_BOOKING_DRAFT_KEY);
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        setAuthError('Google sign-in could not be completed. Continue as guest or try again.');
      }
    };

    void loadGoogleProfile();
    // This runs only on the OAuth redirect landing. The location field helpers are intentionally
    // read from the initial render so the booking draft can be restored before the modal reopens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickAnotherBooking = () => {
    setIsSuccess(false);
    setBookingReferences([]);
    setCreatedBookingDetails([]);
    resetBookingAuth();
    onReset?.();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setPickupLocationError('Location is not supported on this device/browser.');
      return;
    }

    setIsLocatingPickup(true);
    setPickupLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const fallbackLabel = `Current Location (${latitude}, ${longitude})`;

      pickupField.setResolvedLocation(fallbackLabel, {
        latitude,
        longitude,
        source: 'current-location',
      });

      setFormData((prev) => ({
        ...prev,
        pickupLocation: fallbackLabel,
        pickupLatitude: latitude,
        pickupLongitude: longitude,
        pickupPlaceId: '',
        pickupLocationSource: 'current-location',
      }));

      setErrors((prev) => ({ ...prev, pickupLocation: undefined }));
      setRouteMessage(null);
      setPriceQuote(null);
    } catch (error) {
      let errorMessage = 'Unable to fetch location';
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied';
        }
      }

      setPickupLocationError(errorMessage);
    } finally {
      setIsLocatingPickup(false);
    }
  };

  const handleContinueWithGoogle = async () => {
    setIsAuthBusy(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/google/start', { method: 'POST' });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setAuthError('Google sign-in is not configured yet. Continue as guest for now.');
        setIsAuthBusy(false);
        return;
      }

      window.localStorage.setItem(
        GOOGLE_BOOKING_DRAFT_KEY,
        JSON.stringify({
          formData,
          bookingMode,
          pickupTiming,
          pickupDate,
          pickupTime,
          returnDate,
          returnTime,
          selectedRide,
          priceQuote,
        })
      );
      window.location.href = data.url;
    } catch {
      setAuthError('Google sign-in could not start. Continue as guest or try again.');
      setIsAuthBusy(false);
    }
  };

  const handleContinueAsGuest = () => {
    setAuthProvider('phone_guest');
    setAuthStep('otp');
    setAuthError(null);
  };

  const handleSendOtp = async () => {
    if (otpResendSeconds > 0 || !otpPhone.trim()) {
      setAuthError(!otpPhone.trim() ? 'Enter your phone number first.' : null);
      return;
    }

    setIsAuthBusy(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error === 'OTP_RATE_LIMITED' ? 'Too many code requests. Please wait and try again.' : 'Could not send the code. Please try again.');
        setIsAuthBusy(false);
        return;
      }

      setOtpSent(true);
      setOtpResendSeconds(60);
      setDevOtpCode(null);
      setPhoneVerified(false);
      setPhoneVerificationToken('');
      setVerifiedPhone('');
      setIsAuthBusy(false);
    } catch {
      setAuthError('Could not send the code. Please try again.');
      setIsAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpPhone.trim() || !otpCode.trim()) {
      setAuthError('Enter your phone number and 6-digit code.');
      return;
    }
    if (!customerProfile.fullName.trim()) {
      setProfileErrors((prev) => ({ ...prev, fullName: 'Enter your full name' }));
      setAuthError('Enter your name before verifying your phone.');
      return;
    }
    if (customerProfile.email && !z.string().email().safeParse(customerProfile.email).success) {
      setProfileErrors((prev) => ({ ...prev, email: 'Enter a valid email' }));
      setAuthError('Enter a valid email or leave it blank.');
      return;
    }

    setIsAuthBusy(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok || !data.verificationToken) {
        setAuthError(data.error || 'Phone verification failed. Please try again.');
        setIsAuthBusy(false);
        return;
      }

      setPhoneVerificationToken(data.verificationToken);
      setPhoneVerified(true);
      setVerifiedPhone(data.bookingPhone || data.phone || otpPhone);
      setFormData((prev) => ({ ...prev, phone: data.bookingPhone || data.phone || otpPhone }));
      setCustomerProfile((prev) => ({
        ...prev,
        fullName: prev.fullName || formData.fullName,
        email: prev.email || formData.email || '',
      }));
      setAuthStep('ready');
      setIsAuthBusy(false);
    } catch {
      setAuthError('Phone verification failed. Please try again.');
      setIsAuthBusy(false);
    }
  };

  async function verifyOtpForBooking() {
    if (!otpPhone.trim() || !otpCode.trim()) {
      setAuthError('Enter your 6-digit code.');
      return false;
    }

    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: otpPhone, code: otpCode }),
    });
    const data = await response.json();

    if (!response.ok || !data.verificationToken) {
      setAuthError(data.error || 'Phone verification failed. Please try again.');
      return false;
    }

    setPhoneVerificationToken(data.verificationToken);
    setPhoneVerified(true);
    setVerifiedPhone(data.bookingPhone || data.phone || otpPhone);
    setFormData((prev) => ({ ...prev, phone: data.bookingPhone || data.phone || otpPhone }));
    setAuthStep('ready');
    return true;
  }

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCustomerProfile((prev) => ({ ...prev, [name]: value }));
    setProfileErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetBookingAuth = () => {
    setAuthProvider('phone_guest');
    setAuthStep('otp');
    setIsAuthBusy(false);
    setAuthError(null);
    setOtpPhone('');
    setOtpCode('');
    setOtpSent(false);
    setOtpResendSeconds(0);
    setDevOtpCode(null);
    setPhoneVerified(false);
    setPhoneVerificationToken('');
    setVerifiedPhone('');
    setCustomerProfile({
      fullName: '',
      email: '',
      emailVerified: false,
      supabaseUserId: '',
    });
    setProfileErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setRouteMessage(null);

    const routeErrors: Partial<Record<BookingErrorField, string>> = {};
    if (!formData.pickupLocation.trim()) {
      routeErrors.pickupLocation = 'Please enter pickup location';
    }
    if (!formData.dropoffLocation.trim()) {
      routeErrors.dropoffLocation = 'Please enter drop location';
    }

    if (Object.keys(routeErrors).length > 0) {
      setErrors(routeErrors);
      return;
    }

    const fixedRoutePrice = getFixedRoutePrice(formData.pickupLocation, formData.dropoffLocation);

    if (!fixedRoutePrice) {
      setPriceQuote(null);
      setRouteMessage(UNAVAILABLE_ROUTE_MESSAGE);
      return;
    }

    if (pickupTiming === 'LATER' || bookingMode === 'ROUND_TRIP') {
      setShowDateTimeModal(true);
      return;
    }

    const nextFormData: BookingFormData = {
      ...formData,
      pickupDateTime: new Date().toISOString(),
      carType: 'SEDAN',
      fareAmount: getRideFare(fixedRoutePrice, 'SEDAN'),
    };

    setSelectedRide('SEDAN');
    setFormData(nextFormData);
    openRideOptionsPage({
      formData: nextFormData,
      bookingMode,
      pickupTiming,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      selectedRide: 'SEDAN',
      priceQuote: fixedRoutePrice,
    });
  };

  const handleConfirmDateTime = () => {
    const pickupDateTime =
      pickupTiming === 'NOW' ? new Date().toISOString() : buildPickupDateTime(pickupDate, pickupTime);

    const validationErrors: Partial<Record<BookingErrorField, string>> = {};

    if (pickupTiming === 'LATER' && !pickupDateTime) {
      validationErrors.pickupDateTime = 'Please select pickup date and time';
    }

    if (bookingMode === 'ROUND_TRIP') {
      const returnDateTimeErr = validateReturnDateTime(pickupDateTime, returnDateTime);
      if (returnDateTimeErr) {
        validationErrors.returnDateTime = returnDateTimeErr;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const fixedRoutePrice = getFixedRoutePrice(formData.pickupLocation, formData.dropoffLocation);

    if (!fixedRoutePrice) {
      setShowDateTimeModal(false);
      setRouteMessage(UNAVAILABLE_ROUTE_MESSAGE);
      return;
    }

    const nextFormData: BookingFormData = {
      ...formData,
      pickupDateTime,
      carType: 'SEDAN',
      fareAmount: getRideFare(fixedRoutePrice, 'SEDAN'),
    };

    setShowDateTimeModal(false);
    setSelectedRide('SEDAN');
    setFormData(nextFormData);
    openRideOptionsPage({
      formData: nextFormData,
      bookingMode,
      pickupTiming,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      selectedRide: 'SEDAN',
      priceQuote: fixedRoutePrice,
    });
  };

  const handleBookNow = async () => {
    if (!priceQuote) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setBookingError(null);
    setAuthError(null);

    if (authStep !== 'otp' || !customerProfile.fullName.trim()) {
      setBookingError('Verify your phone before booking.');
      setIsSubmitting(false);
      return;
    }

    if (!phoneVerified) {
      if (!otpSent) {
        setBookingError('Please verify phone number');
        setIsSubmitting(false);
        return;
      }

      const verified = await verifyOtpForBooking();
      if (!verified) {
        setIsSubmitting(false);
        return;
      }
    }

    if (
      !phoneVerified ||
      !phoneVerificationToken ||
      !verifiedPhone ||
      !customerProfile.fullName
    ) {
      setBookingError('Verify your phone before booking.');
      setIsSubmitting(false);
      return;
    }

    const pickupDateTime =
      pickupTiming === 'NOW' ? new Date().toISOString() : formData.pickupDateTime;
    const bookingValidationErrors: Partial<Record<BookingErrorField, string>> = {};

    const returnDateTimeError =
      bookingMode === 'ROUND_TRIP' ? validateReturnDateTime(pickupDateTime, returnDateTime) : null;

    if (returnDateTimeError) {
      bookingValidationErrors.returnDateTime = returnDateTimeError;
    }

    if (Object.keys(bookingValidationErrors).length > 0) {
      setErrors(bookingValidationErrors);
      setIsSubmitting(false);
      return;
    }

    const result = bookingSchema.safeParse({
      ...formData,
      fullName: customerProfile.fullName,
      email: customerProfile.email,
      phone: verifiedPhone,
      pickupDateTime,
      carType: selectedRide,
      fareAmount: finalPrice,
    });

    if (!result.success) {
      const fieldErrors: Partial<Record<BookingErrorField, string>> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof BookingFormData;
        if (fieldName in formData) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: result.data.bookingType,
          fullName: customerProfile.fullName,
          email: customerProfile.email,
          phone: verifiedPhone,
          phoneVerificationToken,
          authProvider,
          emailVerified: customerProfile.emailVerified,
          supabaseUserId: customerProfile.supabaseUserId || undefined,
          pickupLocation: result.data.pickupLocation,
          dropoffLocation: result.data.dropoffLocation,
          pickupDateTime: new Date(result.data.pickupDateTime).toISOString(),
          carType: selectedRide,
          fareAmount: finalPrice,
          specialInstructions: result.data.specialInstructions,
          pickupLatitude: result.data.pickupLatitude,
          pickupLongitude: result.data.pickupLongitude,
          pickupPlaceId: result.data.pickupPlaceId,
          pickupLocationSource: result.data.pickupLocationSource,
          dropoffLatitude: result.data.dropoffLatitude,
          dropoffLongitude: result.data.dropoffLongitude,
          dropoffPlaceId: result.data.dropoffPlaceId,
          dropoffLocationSource: result.data.dropoffLocationSource,
          bookingMode,
          returnPickupDateTime:
            bookingMode === 'ROUND_TRIP' ? new Date(returnDateTime).toISOString() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBookingError("We couldn't create your booking right now. Please try again or call support.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      const createdBookings: BookingResponseItem[] = Array.isArray(data.data) ? data.data : [data.data];
      setBookingReferences(
        createdBookings
          .map((booking) => booking?.publicBookingId ?? booking?.bookingReference)
          .filter((reference): reference is string => Boolean(reference))
      );
      setCreatedBookingDetails(createdBookings);
      setPriceQuote(null);
      setRouteMessage(null);
      setBookingError(null);
      window.sessionStorage.removeItem(RIDE_OPTIONS_DRAFT_KEY);
      onBookingSuccess?.();
      pickupField.reset();
      dropoffField.reset();
      setPickupDate('');
      setPickupTime('');
      setReturnDate('');
      setReturnTime('');
      setBookingMode('ONE_WAY');
      setPickupTiming('NOW');
      setSelectedRide('SEDAN');
      setPickupLocationError(null);
      resetBookingAuth();
      setFormData((prev) => ({
        bookingType: prev.bookingType,
        fullName: '',
        email: '',
        phone: '',
        pickupLocation: '',
        dropoffLocation: '',
        pickupDateTime: '',
        carType: 'SEDAN',
        fareAmount: undefined,
        specialInstructions: '',
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
      setIsSubmitting(false);
    } catch {
      setBookingError("We couldn't create your booking right now. Please try again or call support.");
      setIsSubmitting(false);
    }
  };

  if (isRideOptionsPage) {
    if (isSuccess) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-3xl items-center px-4 py-10">
          <div
            ref={confirmationRef}
            className="flex w-full flex-col items-center justify-center rounded-[26px] border border-amber-100 bg-amber-50 px-8 py-12 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-zinc-900">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
              Request received
            </h3>
            <p className="max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We have your route details. Our team will confirm availability and pricing shortly.
            </p>
            {bookingReferences.length > 0 && (
              <div className="mt-4 space-y-2">
                {bookingReferences.map((reference) => (
                  <p
                    key={reference}
                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    Booking ID: {reference}
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Start another search
            </button>
          </div>
        </div>
      );
    }

    if (!priceQuote) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-2xl items-center px-4 py-10">
          <div className="w-full rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white">Choose a ride</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400">
              Your ride search has expired. Start a new route search to see available rides.
            </p>
            <button
              type="button"
              onClick={() => router.push('/#ride')}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              Back to Ride
            </button>
          </div>
        </div>
      );
    }

    return (
      <RideSelectionView
        authError={authError}
        authStep={authStep}
        bookingError={bookingError}
        bookingMode={bookingMode}
        customerProfile={customerProfile}
        devOtpCode={devOtpCode}
        finalPrice={finalPrice}
        formData={formData}
        isAuthBusy={isAuthBusy}
        isSubmitting={isSubmitting}
        onBack={() => router.push('/#ride')}
        onBookNow={handleBookNow}
        onContinueAsGuest={handleContinueAsGuest}
        onContinueWithGoogle={handleContinueWithGoogle}
        onInputChange={handleInputChange}
        onProfileChange={handleProfileChange}
        onRideSelect={handleRideSelect}
        onSendOtp={handleSendOtp}
        onOtpCodeChange={(event) => {
          setOtpCode(event.target.value);
          setAuthError(null);
        }}
        onOtpPhoneChange={(event) => {
          setOtpPhone(event.target.value);
          setPhoneVerified(false);
          setPhoneVerificationToken('');
          setVerifiedPhone('');
          setAuthError(null);
        }}
        otpCode={otpCode}
        otpPhone={otpPhone}
        otpResendSeconds={otpResendSeconds}
        otpSent={otpSent}
        pickupDisplayTime={pickupDisplayTime}
        pickupTiming={pickupTiming}
        profileErrors={profileErrors}
        returnDateTime={returnDateTime}
        rideOptions={rideOptions}
        selectedRide={selectedRide}
        totalPrice={totalPrice}
      />
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
      {isSuccess ? (
        <div
          ref={confirmationRef}
          className="flex flex-col items-center justify-center rounded-[26px] border border-amber-100 bg-amber-50 px-8 py-12 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-zinc-900">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
            Request received
          </h3>
          <p className="max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            We have your route details. Our team will confirm availability and pricing shortly.
          </p>
          <p className="mt-3 max-w-md text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Save this booking ID to check your ride status later.
          </p>
          {bookingReferences.length > 0 && (
            <div className="mt-4 space-y-2">
              {bookingReferences.map((reference) => (
                <p
                  key={reference}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Booking ID: {reference}
                </p>
              ))}
            </div>
          )}
          {createdBookingDetails[0]?.customerPublicId && (
            <p className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
              Customer ID: {createdBookingDetails[0].customerPublicId}
            </p>
          )}
          {createdBookingDetails.length > 0 && (
            <div className="mt-5 w-full max-w-md space-y-2 text-left">
              {createdBookingDetails.map((booking) => (
                <div
                  key={booking.publicBookingId ?? booking.bookingReference}
                  className="rounded-2xl border border-amber-100 bg-white p-4 text-sm shadow-sm dark:border-amber-900/40 dark:bg-zinc-900"
                >
                  <div className="font-bold text-zinc-950 dark:text-zinc-100">
                    {booking.pickupLocation} to {booking.dropoffLocation}
                  </div>
                  <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {booking.pickupDateTime ? formatPickupDateTime(booking.pickupDateTime) : 'Pickup time pending'} · {booking.carType ?? 'Sedan'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleClickAnotherBooking}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start another search
          </button>
        </div>
      ) : (
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
            {[
              { value: 'ONE_WAY', label: 'One Way' },
              { value: 'ROUND_TRIP', label: 'Round Trip' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  const nextMode = tab.value as BookingMode;
                  setBookingMode(nextMode);
                  setPriceQuote(null);
                  setErrors((prev) => ({
                    ...prev,
                    returnDateTime: nextMode === 'ONE_WAY' ? undefined : prev.returnDateTime,
                  }));
                }}
                className={cn(
                  'min-h-10 min-w-0 rounded-full px-4 text-sm font-semibold transition-colors',
                  bookingMode === tab.value
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <BookingField
              name="pickup_location_field"
              value={pickupField.address}
              onChange={handleInputChange}
              onFocus={() => {
                setActiveLocationField('pickupLocation');
                setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
              onKeyDown={(event) => handleLocationFieldKeyDown(event, 'pickupLocation')}
              placeholder="Pickup location"
              error={errors.pickupLocation || pickupLocationError || undefined}
              icon="pickup"
              suggestions={activeLocationField === 'pickupLocation' ? activeLocationSuggestions : []}
              highlightedSuggestionIndex={highlightedSuggestionIndex}
              onSuggestionSelect={(suggestion) => handleLocationSuggestionSelect('pickupLocation', suggestion)}
              showLocationIcon
              onLocationIconClick={handleUseCurrentLocation}
              isLoadingLocation={isLocatingPickup}
              isLoadingSuggestions={activeLocationField === 'pickupLocation' && isAddressLoading.pickupLocation}
            />
            <BookingField
              name="dropoff_location_field"
              value={dropoffField.address}
              onChange={handleInputChange}
              onFocus={() => {
                setActiveLocationField('dropoffLocation');
                setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
              onKeyDown={(event) => handleLocationFieldKeyDown(event, 'dropoffLocation')}
              placeholder="Dropoff location"
              error={errors.dropoffLocation}
              icon="dropoff"
              suggestions={activeLocationField === 'dropoffLocation' ? activeLocationSuggestions : []}
              highlightedSuggestionIndex={highlightedSuggestionIndex}
              onSuggestionSelect={(suggestion) => handleLocationSuggestionSelect('dropoffLocation', suggestion)}
              isLoadingSuggestions={activeLocationField === 'dropoffLocation' && isAddressLoading.dropoffLocation}
             />

             <div ref={pickupTimingMenuRef} className="relative inline-block">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isPickupTimingOpen}
                onClick={() => setIsPickupTimingOpen((isOpen) => !isOpen)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-950 shadow-sm shadow-zinc-950/5 outline-none transition-colors',
                  'hover:border-zinc-300 hover:bg-zinc-50 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5',
                  'dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:shadow-black/20 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:border-amber-300 dark:focus:ring-amber-300/10'
                )}
              >
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span>
                  {pickupTiming === 'NOW' ? 'Pickup now' : 'Schedule later'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400',
                    isPickupTimingOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {isPickupTimingOpen && (
                <div
                  role="listbox"
                  aria-label="Pickup timing"
                  className="absolute left-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[16px] border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
                >
                  {[
                    { value: 'NOW', label: 'Pickup now' },
                    { value: 'LATER', label: 'Schedule later' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={pickupTiming === option.value}
                      onClick={() => handlePickupTimingChange(option.value as PickupTiming)}
                      className={cn(
                        'flex min-h-9 w-full items-center rounded-[12px] px-3 text-left text-sm font-semibold text-zinc-950 transition-colors',
                        'hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none',
                        'dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900',
                        pickupTiming === option.value && 'bg-zinc-100 dark:bg-zinc-900'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

           </div>

           {routeMessage && (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {routeMessage}
            </div>
          )}

          <div className="relative min-h-13 w-full">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                mainActionClassName,
                'absolute inset-0',
                isRouteUnavailable && 'pointer-events-none translate-y-1 opacity-0'
              )}
              tabIndex={isRouteUnavailable ? -1 : undefined}
            >
              {isSubmitting ? 'Checking...' : 'See Prices'}
            </button>
            <a
              href={CONTACT_PHONE_HREF}
              className={cn(
                mainActionClassName,
                'absolute inset-0',
                isRouteUnavailable ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
              )}
              tabIndex={isRouteUnavailable ? undefined : -1}
              aria-label="Call UrbanMiles now"
            >
              Call Now
            </a>
          </div>
        </div>
      )}
    </form>
    {showDateTimeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-6 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl shadow-zinc-950/25 dark:bg-zinc-950 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">When&apos;s your ride?</h3>
              <div className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup:</span> {formData.pickupLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Dropoff:</span> {formData.dropoffLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Ride type:</span> {bookingMode === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup mode:</span> {pickupTiming === 'NOW' ? 'Pickup now' : 'Schedule later'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDateTimeModal(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {pickupTiming === 'LATER' && (
            <div className="mb-5">
              <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Pickup date &amp; time</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <BookingField
                  name="pickupDate"
                  type="date"
                  value={pickupDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Pickup date"
                  error={errors.pickupDateTime}
                  required
                />
                <BookingField
                  name="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={handleInputChange}
                  placeholder="Pickup time"
                  error={!pickupDate ? undefined : errors.pickupDateTime}
                  required
                />
              </div>
            </div>
          )}

          {bookingMode === 'ROUND_TRIP' && (
            <div className="mb-5">
              <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Return date &amp; time</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <BookingField
                  name="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={handleInputChange}
                  min={pickupTiming === 'LATER' && pickupDate ? pickupDate : new Date().toISOString().split('T')[0]}
                  placeholder="Return date"
                  error={errors.returnDateTime}
                  required
                />
                <BookingField
                  name="returnTime"
                  type="time"
                  value={returnTime}
                  onChange={handleInputChange}
                  placeholder="Return time"
                  error={!returnDate ? undefined : errors.returnDateTime}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmDateTime}
            className={cn(
              mainActionClassName,
              'w-full'
            )}
          >
            Continue
          </button>
        </div>
      </div>
    )}

    {isRideOptionsPage && priceQuote && (
      <RideSelectionView
        authError={authError}
        authStep={authStep}
        bookingError={bookingError}
        bookingMode={bookingMode}
        customerProfile={customerProfile}
        devOtpCode={devOtpCode}
        finalPrice={finalPrice}
        formData={formData}
        isAuthBusy={isAuthBusy}
        isSubmitting={isSubmitting}
        onBack={() => setPriceQuote(null)}
        onBookNow={handleBookNow}
        onContinueAsGuest={handleContinueAsGuest}
        onContinueWithGoogle={handleContinueWithGoogle}
        onInputChange={handleInputChange}
        onProfileChange={handleProfileChange}
        onRideSelect={handleRideSelect}
        onSendOtp={handleSendOtp}
        onOtpCodeChange={(event) => {
          setOtpCode(event.target.value);
          setAuthError(null);
        }}
        onOtpPhoneChange={(event) => {
          setOtpPhone(event.target.value);
          setPhoneVerified(false);
          setPhoneVerificationToken('');
          setVerifiedPhone('');
          setAuthError(null);
        }}
        otpCode={otpCode}
        otpPhone={otpPhone}
        otpResendSeconds={otpResendSeconds}
        otpSent={otpSent}
        pickupDisplayTime={pickupDisplayTime}
        pickupTiming={pickupTiming}
        profileErrors={profileErrors}
        returnDateTime={returnDateTime}
        rideOptions={rideOptions}
        selectedRide={selectedRide}
        totalPrice={totalPrice}
      />
    )}
    </>
  );
}

const mainActionClassName = cn(
  'flex min-h-13 w-full items-center justify-center overflow-hidden rounded-full bg-zinc-950 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-zinc-950/15 transition-all duration-200 ease-out hover:bg-zinc-800',
  'disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300'
);

type RideSelectionOption = {
  value: RideOption;
  name: string;
  passengers: number;
  badge: string;
  description: string;
  eta: string;
  fare: number;
};

interface RideSelectionViewProps {
  authError: string | null;
  authStep: BookingAuthStep;
  bookingError: string | null;
  bookingMode: BookingMode;
  customerProfile: CustomerProfile;
  devOtpCode: string | null;
  finalPrice: number;
  formData: BookingFormData;
  isAuthBusy: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onBookNow: () => void;
  onContinueAsGuest: () => void;
  onContinueWithGoogle: () => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onOtpCodeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOtpPhoneChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRideSelect: (ride: RideOption) => void;
  onSendOtp: () => void;
  otpCode: string;
  otpPhone: string;
  otpResendSeconds: number;
  otpSent: boolean;
  pickupDisplayTime: string;
  pickupTiming: PickupTiming;
  profileErrors: Partial<Record<keyof CustomerProfile, string>>;
  returnDateTime: string;
  rideOptions: RideSelectionOption[];
  selectedRide: RideOption;
  totalPrice: number;
}

function RideSelectionView({
  authError,
  authStep,
  bookingError,
  bookingMode,
  customerProfile,
  devOtpCode,
  finalPrice,
  formData,
  isAuthBusy,
  isSubmitting,
  onBack,
  onBookNow,
  onContinueAsGuest,
  onContinueWithGoogle,
  onInputChange,
  onOtpCodeChange,
  onOtpPhoneChange,
  onProfileChange,
  onRideSelect,
  onSendOtp,
  otpCode,
  otpPhone,
  otpResendSeconds,
  otpSent,
  pickupDisplayTime,
  pickupTiming,
  profileErrors,
  returnDateTime,
  rideOptions,
  selectedRide,
  totalPrice,
}: RideSelectionViewProps) {
  const selectedRideOption =
    rideOptions.find((option) => option.value === selectedRide) ?? rideOptions[0];

  return (
    <main className="min-h-[calc(100vh-72px)] overflow-x-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="grid min-h-[calc(100vh-72px)] grid-cols-1 lg:grid-cols-[minmax(390px,520px)_minmax(0,1fr)]">
        <section className="order-2 flex min-h-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:order-1">
          <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>

            <div>
              <h2 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                Choose a ride
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Choose the best option for your trip
              </p>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Trip summary
                </h3>
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full px-3 py-1.5 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-400/10"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <TripSummaryRow iconClassName="bg-zinc-950 dark:bg-white" label="Pickup" value={formData.pickupLocation} />
                <TripSummaryRow iconClassName="bg-amber-500" label="Dropoff" value={formData.dropoffLocation} />
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Pickup time
                    </p>
                    <p className="mt-1 font-bold text-zinc-950 dark:text-white">
                      {pickupDisplayTime}
                    </p>
                  </div>
                </div>
                {bookingMode === 'ROUND_TRIP' && (
                  <p className="rounded-[16px] bg-white px-3 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    Return pickup: {formatPickupDateTime(returnDateTime)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {rideOptions.map((option) => {
                const isSelected = selectedRide === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onRideSelect(option.value)}
                    className={cn(
                      'group flex w-full items-center gap-4 rounded-[24px] border p-4 text-left transition-all',
                      isSelected
                        ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-500/10 ring-2 ring-amber-300/40 dark:border-amber-300 dark:bg-amber-400/10 dark:ring-amber-300/20'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
                    )}
                  >
                    <div className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border',
                      isSelected
                        ? 'border-amber-300 bg-white text-zinc-950 dark:bg-zinc-950 dark:text-amber-200'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
                    )}>
                      <Car className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-zinc-950 dark:text-white">{option.name}</h3>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                          {option.badge}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {option.passengers} passengers
                        </span>
                        <span>{option.eta} pickup</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {option.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black text-zinc-950 dark:text-white">
                        {formatMoney(option.fare)}
                      </p>
                      <ChevronRight className="ml-auto mt-1 h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-0.5 dark:text-zinc-500" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <h4 className="text-base font-bold text-zinc-950 dark:text-white">Verify customer details</h4>
              </div>

              {authStep === 'choice' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onContinueWithGoogle}
                    disabled={isAuthBusy}
                    className="flex min-h-12 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                  >
                    Continue as Guest with Phone
                  </button>
                </div>
              )}

              {authStep === 'otp' && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BookingField
                      name="fullName"
                      value={customerProfile.fullName}
                      onChange={onProfileChange}
                      placeholder="Full name"
                      error={profileErrors.fullName}
                      required
                    />
                    <BookingField
                      name="email"
                      type="email"
                      value={customerProfile.email}
                      onChange={onProfileChange}
                      placeholder="Email optional"
                      error={profileErrors.email}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <BookingField
                      name="otpPhone"
                      value={otpPhone}
                      onChange={onOtpPhoneChange}
                      placeholder="Phone number"
                      required
                    />
                    <button
                      type="button"
                      onClick={onSendOtp}
                      disabled={isAuthBusy || otpResendSeconds > 0}
                      className="flex min-h-13 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {otpResendSeconds > 0 ? `Resend ${otpResendSeconds}s` : otpSent ? 'Resend code' : 'Send code'}
                    </button>
                  </div>
                  <BookingField
                    name="otpCode"
                    value={otpCode}
                    onChange={onOtpCodeChange}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                  {devOtpCode && (
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Dev code: {devOtpCode}
                    </p>
                  )}
                </div>
              )}

              {authError && (
                <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {authError}
                </div>
              )}
            </div>

            <textarea
              name="specialInstructions"
              value={formData.specialInstructions ?? ''}
              onChange={onInputChange}
              placeholder="Note optional"
              className={cn(
                'min-h-24 w-full resize-none rounded-[20px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400',
                'focus:border-zinc-950 focus:bg-white focus:ring-4 focus:ring-zinc-950/5',
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-amber-300 dark:focus:bg-zinc-950 dark:focus:ring-amber-300/10'
              )}
            />

            {bookingError && (
              <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {bookingError}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
            <div className="flex flex-col gap-3 rounded-[24px] border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-zinc-800 dark:bg-zinc-950 dark:text-amber-200">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Pay in car
                  </p>
                  <p className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                    {selectedRideOption?.name ?? 'Miles Eco'} · {formatMoney(totalPrice)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onBookNow}
                disabled={isSubmitting}
                className="flex min-h-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-black text-white shadow-xl shadow-zinc-950/15 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
              >
                {isSubmitting ? 'Booking...' : `Confirm ${selectedRideOption?.name ?? 'Miles Eco'}`}
              </button>
            </div>
          </div>
        </section>

        <section className="order-1 min-h-[360px] bg-zinc-200 dark:bg-zinc-900 lg:order-2 lg:min-h-0">
          <RideMapPreview
            dropoffLatitude={formData.dropoffLatitude ?? null}
            dropoffLongitude={formData.dropoffLongitude ?? null}
            finalPrice={finalPrice}
            pickupDisplayTime={pickupTiming === 'NOW' ? 'Now' : pickupDisplayTime}
            pickupLatitude={formData.pickupLatitude ?? null}
            pickupLongitude={formData.pickupLongitude ?? null}
          />
        </section>
      </div>
    </main>
  );
}

function TripSummaryRow({
  iconClassName,
  label,
  value,
}: {
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', iconClassName)} />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-1 break-words font-bold text-zinc-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function RideMapPreview({
  dropoffLatitude,
  dropoffLongitude,
  finalPrice,
  pickupDisplayTime,
  pickupLatitude,
  pickupLongitude,
}: {
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  finalPrice: number;
  pickupDisplayTime: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreviewState>({
    distanceKm: null,
    durationMinutes: null,
    isLoading: false,
    error: null,
  });
  const hasCoordinates =
    typeof pickupLatitude === 'number' &&
    typeof pickupLongitude === 'number' &&
    typeof dropoffLatitude === 'number' &&
    typeof dropoffLongitude === 'number';

  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) {
      setRoutePreview({
        distanceKm: null,
        durationMinutes: null,
        isLoading: false,
        error: 'Choose Geoapify pickup and dropoff suggestions to preview the route.',
      });
      return;
    }

    let isMounted = true;
    let map: import('maplibre-gl').Map | null = null;

    setRoutePreview({ distanceKm: null, durationMinutes: null, isLoading: true, error: null });

    const initMap = async () => {
      const maplibregl = await import('maplibre-gl');

      if (!isMounted || !mapContainerRef.current) {
        return;
      }

      const pickup: [number, number] = [pickupLongitude, pickupLatitude];
      const dropoff: [number, number] = [dropoffLongitude, dropoffLatitude];
      const center: [number, number] = [
        (pickup[0] + dropoff[0]) / 2,
        (pickup[1] + dropoff[1]) / 2,
      ];

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
            },
          ],
        },
        center,
        zoom: 8,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const pickupMarker = document.createElement('div');
      pickupMarker.className = 'h-4 w-4 rounded-full border-2 border-white bg-zinc-950 shadow-lg dark:bg-white';
      const dropoffMarker = document.createElement('div');
      dropoffMarker.className = 'h-4 w-4 rounded-full border-2 border-white bg-amber-500 shadow-lg';

      new maplibregl.Marker({ element: pickupMarker }).setLngLat(pickup).addTo(map);
      new maplibregl.Marker({ element: dropoffMarker }).setLngLat(dropoff).addTo(map);

      map.on('load', async () => {
        if (!map) {
          return;
        }

        const bounds = new maplibregl.LngLatBounds().extend(pickup).extend(dropoff);
        map.fitBounds(bounds, { padding: 90, maxZoom: 12, duration: 0 });

        try {
          const routeResponse = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${pickup[0]},${pickup[1]};${dropoff[0]},${dropoff[1]}?overview=full&geometries=geojson`
          );
          const routeData = await routeResponse.json() as {
            routes?: Array<{
              distance?: number;
              duration?: number;
              geometry?: GeoJSON.LineString;
            }>;
          };
          const route = routeData.routes?.[0];

          if (!routeResponse.ok || !route) {
            throw new Error('Route preview unavailable');
          }

          if (route.geometry) {
            map.addSource('selected-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry,
              },
            });
            map.addLayer({
              id: 'selected-route-line',
              type: 'line',
              source: 'selected-route',
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#f59e0b',
                'line-width': 5,
                'line-opacity': 0.9,
              },
            });
          }

          if (isMounted) {
            setRoutePreview({
              distanceKm: typeof route.distance === 'number' ? route.distance / 1000 : null,
              durationMinutes: typeof route.duration === 'number' ? Math.round(route.duration / 60) : null,
              isLoading: false,
              error: null,
            });
          }
        } catch {
          if (isMounted) {
            setRoutePreview({
              distanceKm: null,
              durationMinutes: null,
              isLoading: false,
              error: 'Route line is unavailable right now.',
            });
          }
        }
      });
    };

    void initMap();

    return () => {
      isMounted = false;
      map?.remove();
    };
  }, [dropoffLatitude, dropoffLongitude, hasCoordinates, pickupLatitude, pickupLongitude]);

  if (!hasCoordinates) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-900">
        <div className="max-w-sm rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30">
          <MapPin className="mx-auto h-8 w-8 text-amber-500" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-black text-zinc-950 dark:text-white">Map preview</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400">
            Select Geoapify pickup and dropoff suggestions to show markers and route details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-2xl shadow-zinc-950/20 backdrop-blur dark:border-zinc-800/90 dark:bg-zinc-950/95">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <RouteInfoItem label="Pickup" value={pickupDisplayTime} />
          <RouteInfoItem
            label="Distance"
            value={routePreview.isLoading ? 'Loading...' : formatDistance(routePreview.distanceKm)}
          />
          <RouteInfoItem
            label="Trip time"
            value={routePreview.isLoading ? 'Loading...' : formatTripDuration(routePreview.durationMinutes)}
          />
          <RouteInfoItem label="Fare" value={formatMoney(finalPrice)} />
        </div>
        {routePreview.error && (
          <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {routePreview.error}
          </p>
        )}
        <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Fares are estimates and may vary.
        </p>
      </div>
    </div>
  );
}

function RouteInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 font-black text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

interface BookingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: 'pickup' | 'dropoff';
  suggestions?: AddressSuggestion[];
  highlightedSuggestionIndex?: number;
  onSuggestionSelect?: (suggestion: AddressSuggestion) => void;
  showLocationIcon?: boolean;
  onLocationIconClick?: () => void;
  isLoadingLocation?: boolean;
  isLoadingSuggestions?: boolean;
}

function BookingField({
  error,
  icon,
  className,
  suggestions = [],
  highlightedSuggestionIndex = 0,
  onSuggestionSelect,
  showLocationIcon,
  onLocationIconClick,
  isLoadingLocation,
  isLoadingSuggestions,
  ...props
}: BookingFieldProps) {
  const listboxId = `${props.name ?? 'location'}-suggestions`;
  const showDropdown = suggestions.length > 0 || isLoadingSuggestions;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex min-h-13 items-center gap-4 rounded-[20px] border bg-zinc-50 px-5 transition-colors',
          'border-zinc-200 focus-within:border-zinc-950 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-950/5',
          'dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-amber-300 dark:focus-within:bg-zinc-950 dark:focus-within:ring-amber-300/10',
          error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/10'
        )}
      >
        {icon && (
          <span
            className={cn(
              'h-3 w-3 shrink-0 rounded-full',
              icon === 'pickup' ? 'bg-zinc-950 dark:bg-white' : 'bg-amber-500'
            )}
          />
        )}
        <input
          {...props}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-autocomplete={showDropdown ? 'list' : undefined}
          aria-controls={showDropdown ? listboxId : undefined}
          placeholder={error || props.placeholder}
          className={cn(
            'min-h-11 w-full min-w-0 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400',
            'dark:text-white dark:placeholder:text-zinc-500',
            error && 'placeholder:text-red-500 dark:placeholder:text-red-400',
            showLocationIcon && 'pr-10',
            className
          )}
        />
        {showLocationIcon && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onLocationIconClick}
            disabled={isLoadingLocation}
            title="Use current location"
            aria-label="Use current location"
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700',
              'dark:text-zinc-500 dark:hover:text-zinc-200',
              isLoadingLocation && 'pointer-events-none opacity-50'
            )}
          >
            {isLoadingLocation
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Navigation className="h-4 w-4 rotate-[-45deg]" aria-hidden="true" />
            }
          </button>
        )}
      </div>
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="dashboard-scrollbar absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[min(18rem,52vh)] overflow-y-auto rounded-[18px] border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
        >
          {isLoadingSuggestions ? (
            <div className="flex min-h-10 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching addresses...
            </div>
          ) : null}
          {!isLoadingSuggestions && suggestions.length === 0 ? (
            <div className="min-h-10 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              No addresses found
            </div>
          ) : null}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === highlightedSuggestionIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect?.(suggestion)}
              className={cn(
                'flex min-h-12 w-full flex-col justify-center rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-zinc-950 transition-colors touch-manipulation',
                'hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none',
                'dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900',
                index === highlightedSuggestionIndex && 'bg-zinc-100 dark:bg-zinc-900'
              )}
            >
              <span className="w-full truncate">{suggestion.addressLine1 || suggestion.formatted}</span>
              {suggestion.addressLine2 ? (
                <span className="mt-0.5 w-full truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {suggestion.addressLine2}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchGeoapifyAddressSuggestions(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    text: query,
    format: 'json',
    limit: '6',
    lang: 'en',
    filter: 'countrycode:in',
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Address autocomplete failed');
  }

  const data = (await response.json()) as GeoapifyAutocompleteResponse;

  return (data.results ?? [])
    .map((result, index) => createGeoapifyAddressSuggestion(result, index))
    .filter((suggestion): suggestion is AddressSuggestion => Boolean(suggestion));
}

function createGeoapifyAddressSuggestion(
  result: GeoapifyAutocompleteResult,
  index: number
): AddressSuggestion | null {
  const formatted = result.formatted?.trim();
  const latitude = typeof result.lat === 'number' ? result.lat : null;
  const longitude = typeof result.lon === 'number' ? result.lon : null;

  if (!formatted) {
    return null;
  }

  return {
    id: result.place_id || `${formatted}-${index}`,
    formatted,
    latitude,
    longitude,
    placeId: result.place_id ?? '',
    addressLine1: result.address_line1 || result.city || formatted,
    addressLine2: result.address_line2 || [result.state, result.country].filter(Boolean).join(', '),
  };
}

function createManualAddressSuggestion(cityName: string): AddressSuggestion {
  return {
    id: `manual-${cityName}`,
    formatted: cityName,
    latitude: null,
    longitude: null,
    placeId: '',
    addressLine1: cityName,
    addressLine2: 'Fixed route city',
  };
}

function buildPickupDateTime(date: string, time: string) {
  if (!date || !time) {
    return '';
  }

  return `${date}T${time}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getRideFare(priceQuote: FixedRoutePrice, ride: RideOption) {
  if (ride === 'VAN') {
    return priceQuote.sedanPrice + 1800;
  }

  return priceQuote.sedanPrice;
}

function buildRideOptions(priceQuote: FixedRoutePrice | null): RideSelectionOption[] {
  if (!priceQuote) {
    return [];
  }

  return [
    {
      value: 'SEDAN',
      name: 'Miles Eco',
      passengers: 4,
      badge: 'Best value',
      description: 'Everyday sedan for simple city-to-city rides.',
      eta: '8 min',
      fare: getRideFare(priceQuote, 'SEDAN'),
    },
    {
      value: 'VAN',
      name: 'Miles XL',
      passengers: 6,
      badge: 'Larger vehicle',
      description: 'Roomier option for families and larger groups.',
      eta: '12 min',
      fare: getRideFare(priceQuote, 'VAN'),
    },
  ];
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) {
    return 'Pending';
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function formatTripDuration(durationMinutes: number | null) {
  if (durationMinutes === null) {
    return 'Pending';
  }

  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatPickupDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}

function validateReturnDateTime(outgoingDateTime: string, returnDateTime: string) {
  if (!returnDateTime) {
    return 'Please select return date and time';
  }

  const outgoing = new Date(outgoingDateTime);
  const returning = new Date(returnDateTime);

  if (Number.isNaN(returning.getTime())) {
    return 'Please select return date and time';
  }

  if (!Number.isNaN(outgoing.getTime()) && returning <= outgoing) {
    return 'Return date and time must be after pickup date and time';
  }

  return null;
}
