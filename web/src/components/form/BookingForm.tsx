'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { CalendarClock, ChevronDown, Navigation, ShieldCheck, X } from 'lucide-react';
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
type RideOption = 'SEDAN' | 'SUV';
type LocationFieldName = 'pickupLocation' | 'dropoffLocation';
type BookingErrorField = keyof BookingFormData | 'returnDateTime';
type BookingAuthProvider = 'google' | 'phone_guest';
type BookingAuthStep = 'choice' | 'otp' | 'ready';
type BookingResponseItem = {
  bookingReference?: string;
  publicBookingId?: string;
  customerPublicId?: string | null;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: string;
  carType?: string;
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
}

export function BookingForm({ onBookingSuccess, onReset }: BookingFormProps) {
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

  const finalPrice = priceQuote ? priceQuote.sedanPrice + (selectedRide === 'SUV' ? 1000 : 0) : 0;
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
    ? getFixedCitySuggestions(activeLocationValue).slice(0, 8)
    : [];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBookingError(null);

    if (name === 'pickupLocation') {
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
    } else if (name === 'dropoffLocation') {
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
      name === 'pickupDate' || name === 'pickupTime'
        ? 'pickupDateTime'
        : name === 'returnDate' || name === 'returnTime'
          ? 'returnDateTime'
          : name;

    if (errors[errorName as BookingErrorField]) {
      setErrors((prev) => ({ ...prev, [errorName]: undefined }));
    }

    if (name === 'pickupLocation' || name === 'dropoffLocation') {
      setActiveLocationField(name);
      setHighlightedSuggestionIndex(0);
    }
  };

  const handleLocationSuggestionSelect = (fieldName: LocationFieldName, cityName: string) => {
    if (fieldName === 'pickupLocation') {
      pickupField.updateAddress(cityName);
      setPickupLocationError(null);
      setFormData((prev) => ({
        ...prev,
        pickupLocation: cityName,
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
      }));
    } else {
      dropoffField.updateAddress(cityName);
      setFormData((prev) => ({
        ...prev,
        dropoffLocation: cityName,
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
    }

    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    setRouteMessage(null);
    setPriceQuote(null);
    setActiveLocationField(null);
    setHighlightedSuggestionIndex(0);
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
      handleLocationSuggestionSelect(fieldName, activeLocationSuggestions[highlightedSuggestionIndex]);
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
      let errorMessage = 'Unable to get your current location right now. Please enter pickup manually.';
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission was denied. Please enter pickup manually.';
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

    const pickupDateTime =
      pickupTiming === 'NOW' ? new Date().toISOString() : formData.pickupDateTime;

    const routeErrors: Partial<Record<BookingErrorField, string>> = {};
    if (!formData.pickupLocation.trim()) {
      routeErrors.pickupLocation = 'Please enter pickup location';
    }
    if (!formData.dropoffLocation.trim()) {
      routeErrors.dropoffLocation = 'Please enter drop location';
    }
    if (pickupTiming === 'LATER' && !pickupDateTime) {
      routeErrors.pickupDateTime = 'Please select pickup date and time';
    }

    const returnDateTimeError =
      bookingMode === 'ROUND_TRIP' ? validateReturnDateTime(pickupDateTime, returnDateTime) : null;

    if (returnDateTimeError) {
      routeErrors.returnDateTime = returnDateTimeError;
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

    setSelectedRide('SEDAN');
    setPriceQuote(fixedRoutePrice);
    setFormData((prev) => ({
      ...prev,
      pickupDateTime,
      carType: 'SEDAN',
      fareAmount: fixedRoutePrice.sedanPrice,
    }));
  };

  const handleBookNow = async () => {
    if (!priceQuote) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setBookingError(null);

    if (
      authStep !== 'ready' ||
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

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
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
            <div ref={pickupTimingMenuRef} className="relative w-[184px] max-w-full">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isPickupTimingOpen}
                onClick={() => setIsPickupTimingOpen((isOpen) => !isOpen)}
                className={cn(
                  'flex h-12 w-full items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 text-sm font-semibold leading-none text-zinc-950 shadow-sm shadow-zinc-950/5 outline-none transition-colors',
                  'hover:border-zinc-300 hover:bg-zinc-50 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5',
                  'dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:shadow-black/20 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:border-amber-300 dark:focus:ring-amber-300/10'
                )}
              >
                <CalendarClock className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {pickupTiming === 'NOW' ? 'Pickup now' : 'Schedule later'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400',
                    isPickupTimingOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {isPickupTimingOpen && (
                <div
                  role="listbox"
                  aria-label="Pickup timing"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
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
                        'flex min-h-10 w-full items-center rounded-[14px] px-3 text-left text-sm font-semibold text-zinc-950 transition-colors',
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

            <BookingField
              name="pickupLocation"
              value={pickupField.address}
              onChange={handleInputChange}
              onFocus={() => {
                setActiveLocationField('pickupLocation');
                setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
              onKeyDown={(event) => handleLocationFieldKeyDown(event, 'pickupLocation')}
              placeholder="Pickup location"
              error={errors.pickupLocation}
              icon="pickup"
              suggestions={activeLocationField === 'pickupLocation' ? activeLocationSuggestions : []}
              highlightedSuggestionIndex={highlightedSuggestionIndex}
              onSuggestionSelect={(cityName) => handleLocationSuggestionSelect('pickupLocation', cityName)}
            />
            <BookingField
              name="dropoffLocation"
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
              onSuggestionSelect={(cityName) => handleLocationSuggestionSelect('dropoffLocation', cityName)}
            />

            {pickupTiming === 'LATER' && (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
            )}

            {bookingMode === 'ROUND_TRIP' && (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
            )}
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingPickup}
            className="inline-flex min-h-8 items-center justify-center rounded-full px-1 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:text-white"
          >
            {isLocatingPickup ? 'Getting current location...' : 'Use current location'}
          </button>

          {pickupLocationError && (
            <p className="text-sm text-red-600 dark:text-red-400">{pickupLocationError}</p>
          )}

          {pickupTiming === 'LATER' && formData.pickupDateTime && !errors.pickupDateTime && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pickup: {formatPickupDateTime(formData.pickupDateTime)}
            </p>
          )}

          {bookingMode === 'ROUND_TRIP' && returnDateTime && !errors.returnDateTime && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Return: {formatPickupDateTime(returnDateTime)}
            </p>
          )}

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
    {priceQuote && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-6 backdrop-blur-sm">
        <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl shadow-zinc-950/25 dark:bg-zinc-950 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">Choose your ride</h3>
              <div className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup:</span> {formData.pickupLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Dropoff:</span> {formData.dropoffLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Ride type:</span> {bookingMode === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup mode:</span> {pickupTiming === 'NOW' ? 'Pickup now' : formatPickupDateTime(formData.pickupDateTime)}</p>
                {bookingMode === 'ROUND_TRIP' && (
                  <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Return pickup:</span> {formatPickupDateTime(returnDateTime)}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPriceQuote(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              aria-label="Close ride selection"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: 'SEDAN', label: 'Sedan / Hatchback', price: priceQuote.sedanPrice },
              { value: 'SUV', label: 'SUV', price: priceQuote.sedanPrice + 1000 },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const nextRide = option.value as RideOption;
                  setSelectedRide(nextRide);
                  setFormData((prev) => ({
                    ...prev,
                    carType: nextRide,
                    fareAmount: option.price,
                  }));
                }}
                className={cn(
                  'rounded-[20px] border p-4 text-left transition-colors',
                  selectedRide === option.value
                    ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-300 dark:bg-amber-400/10'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
                )}
              >
                <span className="block text-base font-bold text-zinc-950 dark:text-white">{option.label}</span>
                <span className="mt-2 block text-2xl font-black text-zinc-950 dark:text-amber-200">
                  {formatMoney(option.price)}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Outgoing price</span>
                <span className="text-base font-bold text-zinc-950 dark:text-white">{formatMoney(finalPrice)}</span>
              </div>
              {bookingMode === 'ROUND_TRIP' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Return price</span>
                  <span className="text-base font-bold text-zinc-950 dark:text-white">{formatMoney(finalPrice)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Total price</span>
                <span className="text-2xl font-black text-zinc-950 dark:text-white">{formatMoney(totalPrice)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <h4 className="text-base font-bold text-zinc-950 dark:text-white">Verify customer details</h4>
              </div>

              {authStep === 'choice' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleContinueWithGoogle}
                    disabled={isAuthBusy}
                    className="flex min-h-12 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueAsGuest}
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
                      onChange={handleProfileChange}
                      placeholder="Full name"
                      error={profileErrors.fullName}
                      required
                    />
                    <BookingField
                      name="email"
                      type="email"
                      value={customerProfile.email}
                      onChange={handleProfileChange}
                      placeholder="Email optional"
                      error={profileErrors.email}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <BookingField
                      name="otpPhone"
                      value={otpPhone}
                      onChange={(event) => {
                        setOtpPhone(event.target.value);
                        setPhoneVerified(false);
                        setPhoneVerificationToken('');
                        setVerifiedPhone('');
                        setAuthError(null);
                      }}
                      placeholder="Phone number"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isAuthBusy || otpResendSeconds > 0}
                      className="flex min-h-13 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {otpResendSeconds > 0 ? `Resend ${otpResendSeconds}s` : otpSent ? 'Resend code' : 'Send code'}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <BookingField
                      name="otpCode"
                      value={otpCode}
                      onChange={(event) => {
                        setOtpCode(event.target.value);
                        setAuthError(null);
                      }}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isAuthBusy || !otpSent || !otpCode.trim()}
                      className="flex min-h-13 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                    >
                      Verify code
                    </button>
                  </div>
                  {devOtpCode && (
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Dev code: {devOtpCode}
                    </p>
                  )}
                </div>
              )}

              {authStep === 'ready' && (
                <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Phone verified. You can now book your ride.
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
              onChange={handleInputChange}
              placeholder="Note optional"
              className={cn(
                'min-h-24 w-full resize-none rounded-[20px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400',
                'focus:border-zinc-950 focus:bg-white focus:ring-4 focus:ring-zinc-950/5',
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-amber-300 dark:focus:bg-zinc-950 dark:focus:ring-amber-300/10'
              )}
            />
          </div>

          {bookingError && (
            <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {bookingError}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setPriceQuote(null)}
              className="flex min-h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleBookNow}
              disabled={isSubmitting || !phoneVerified}
              className="flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-bold text-white shadow-xl shadow-zinc-950/15 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {isSubmitting ? 'Booking...' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

const mainActionClassName = cn(
  'flex min-h-13 w-full items-center justify-center overflow-hidden rounded-full bg-zinc-950 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-zinc-950/15 transition-all duration-200 ease-out hover:bg-zinc-800',
  'disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300'
);

interface BookingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: 'pickup' | 'dropoff';
  suggestions?: string[];
  highlightedSuggestionIndex?: number;
  onSuggestionSelect?: (cityName: string) => void;
  showLocationIcon?: boolean;
  onLocationIconClick?: () => void;
  isLoadingLocation?: boolean;
}

function BookingField({
  error,
  icon,
  className,
  suggestions = [],
  highlightedSuggestionIndex = 0,
  onSuggestionSelect,
  ...props
}: BookingFieldProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          'flex min-h-13 items-center gap-4 rounded-[20px] border bg-zinc-50 px-5 transition-colors',
          'border-zinc-200 focus-within:border-zinc-950 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-950/5',
          'dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-amber-300 dark:focus-within:bg-zinc-950 dark:focus-within:ring-amber-300/10',
          error && 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/10'
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
          aria-invalid={!!error}
          aria-autocomplete={suggestions.length > 0 ? 'list' : undefined}
          aria-expanded={suggestions.length > 0 ? true : undefined}
          className={cn(
            'min-h-11 w-full min-w-0 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400',
            'dark:text-white dark:placeholder:text-zinc-500',
            className
          )}
        />
      </div>
      {suggestions.length > 0 && onSuggestionSelect && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
        >
          {suggestions.map((cityName, index) => (
            <button
              key={cityName}
              type="button"
              role="option"
              aria-selected={index === highlightedSuggestionIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect(cityName)}
              className={cn(
                'flex min-h-10 w-full items-center rounded-[14px] px-3 text-left text-sm font-semibold text-zinc-950 transition-colors',
                'hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none',
                'dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900',
                index === highlightedSuggestionIndex && 'bg-zinc-100 dark:bg-zinc-900'
              )}
            >
              {cityName}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
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
