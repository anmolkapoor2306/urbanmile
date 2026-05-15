export function formatIndianDriverPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  let nationalNumber = digits;

  if (digits.length === 12 && digits.startsWith('91')) {
    nationalNumber = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    nationalNumber = digits.slice(1);
  }

  if (nationalNumber.length !== 10) {
    throw new Error('Enter a valid 10-digit Indian phone number.');
  }

  return `+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`;
}

export function getDriverPhoneLookupValues(identifier: string) {
  const digits = identifier.replace(/\D/g, '');
  const values = new Set<string>();

  if (!digits) return [];

  values.add(identifier.trim());
  values.add(digits);

  if (digits.length === 10) {
    values.add(`91${digits}`);
    values.add(`+91${digits}`);
    values.add(`+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    const nationalNumber = digits.slice(2);
    values.add(nationalNumber);
    values.add(`+91${nationalNumber}`);
    values.add(`+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`);
  }

  return [...values];
}
