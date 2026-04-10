import { describe, it, expect } from 'vitest';
import enLocale from '@/locales/en.json';
import thLocale from '@/locales/th.json';
import zhLocale from '@/locales/zh.json';
import { detectSystemLocale } from '@/lib/i18n/context';

const enKeys = Object.keys(enLocale);
const thKeys = Object.keys(thLocale);
const zhKeys = Object.keys(zhLocale);

describe('locale JSON parity', () => {
  it('en and th have the same keys', () => {
    expect(thKeys.sort()).toEqual(enKeys.sort());
  });

  it('en and zh have the same keys', () => {
    expect(zhKeys.sort()).toEqual(enKeys.sort());
  });

  it('all locales are non-empty', () => {
    expect(enKeys.length).toBeGreaterThan(100);
    expect(thKeys.length).toBeGreaterThan(100);
    expect(zhKeys.length).toBeGreaterThan(100);
  });

  it('app.title is RentOS in all locales', () => {
    const en = enLocale as Record<string, string>;
    const th = thLocale as Record<string, string>;
    const zh = zhLocale as Record<string, string>;
    expect(en['app.title']).toBe('RentOS');
    expect(th['app.title']).toBe('RentOS');
    expect(zh['app.title']).toBe('RentOS');
  });

  it('error keys exist in all three locales', () => {
    const en = enLocale as Record<string, string>;
    const th = thLocale as Record<string, string>;
    const zh = zhLocale as Record<string, string>;
    for (const key of ['error.title', 'error.description', 'error.try_again']) {
      expect(en[key]).toBeTruthy();
      expect(th[key]).toBeTruthy();
      expect(zh[key]).toBeTruthy();
    }
  });
});

describe('detectSystemLocale', () => {
  it('returns null in non-browser environment (SSR)', () => {
    // In Vitest/Node, window is undefined
    expect(detectSystemLocale()).toBeNull();
  });
});
