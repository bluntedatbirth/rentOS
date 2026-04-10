export function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function formatPhone(raw: string | null | undefined): string {
  if (raw == null) return '';
  const digits = stripPhone(raw);
  // 10-digit mobile: 0XX-XXX-XXXX
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 9-digit landline: 0X-XXX-XXXX
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  // Unknown length — return as-is
  return raw;
}
