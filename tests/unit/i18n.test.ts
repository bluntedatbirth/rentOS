import { describe, it, expect } from 'vitest';
import { t, setLocale, getLocale } from '@/lib/i18n';

describe('i18n', () => {
  it('returns Thai string by default', () => {
    setLocale('th');
    expect(t('app.title')).toBe('จัดการเช่า');
  });

  it('returns English string when locale is en', () => {
    setLocale('en');
    expect(t('app.title')).toBe('Rental Manager');
  });

  it('returns the key if not found', () => {
    expect(t('missing.key')).toBe('missing.key');
  });

  it('tracks locale correctly', () => {
    setLocale('th');
    expect(getLocale()).toBe('th');
    setLocale('en');
    expect(getLocale()).toBe('en');
  });
});
