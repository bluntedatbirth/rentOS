// verified:
//   formatDate('2026-04-09', 'th') === '9 เม.ย. 2569'
//   formatDate('2026-04-09', 'en') === '9/4/2026'
//   formatDate(null, 'th') === ''

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

function toDate(d: Date | string | null | undefined): Date | null {
  if (d == null) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(
  d: Date | string | null | undefined,
  locale: 'en' | 'th' | 'zh'
): string {
  const date = toDate(d);
  if (!date) return '';
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  if (locale === 'th') {
    const yearBE = year + 543;
    return `${day} ${THAI_MONTHS_SHORT[month]} ${yearBE}`;
  }
  // en / zh: DD/MM/YYYY
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

export function formatDateTime(
  d: Date | string | null | undefined,
  locale: 'en' | 'th' | 'zh'
): string {
  const date = toDate(d);
  if (!date) return '';
  const datePart = formatDate(date, locale);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${datePart} ${hh}:${mm}`;
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  locale: 'en' | 'th' | 'zh'
): string {
  const s = formatDate(start, locale);
  const e = formatDate(end, locale);
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}
