const DEFAULT_CONTACT_NUMBER = '919876543210';
const DEFAULT_WHATSAPP_MESSAGE = 'Hello I want to book a ride';

function normalizeIndianPhoneNumber(value: string | undefined): string {
  const digitsOnly = value?.replace(/\D/g, '') ?? '';

  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly;
  }

  return DEFAULT_CONTACT_NUMBER;
}

export const CONTACT_PHONE_NUMBER = normalizeIndianPhoneNumber(process.env.NEXT_PUBLIC_CONTACT_PHONE);
export const WHATSAPP_PHONE_NUMBER = normalizeIndianPhoneNumber(
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || process.env.NEXT_PUBLIC_CONTACT_PHONE
);
export const CONTACT_PHONE_HREF = `tel:+${CONTACT_PHONE_NUMBER}`;
export const WHATSAPP_MESSAGE = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || DEFAULT_WHATSAPP_MESSAGE;
export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
