export function formatIndianPhoneDisplay(value: string | null | undefined) {
  if (!value) return 'Not provided';

  const digits = value.replace(/\D/g, '');
  const localNumber = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 10
      ? digits
      : null;

  if (!localNumber) return value;

  return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
}

export function getFirstName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] || 'there';
}
