import { describe, expect, it } from 'vitest';
import { getMobileNavItems } from '@/components/layout/navConfig';

describe('parent mobile navigation', () => {
  it('keeps daily recording and family support accessible without crowding the menu', () => {
    expect(getMobileNavItems('PARENT', true).map(item => item.to)).toEqual([
      '/anasayfa', '/gunluk-takip', '/destek-ara', '/mesajlar',
    ]);
  });

  it('does not show child-dependent actions before a profile exists', () => {
    expect(getMobileNavItems('PARENT', false).every(item => !item.requiresChild)).toBe(true);
    expect(getMobileNavItems('PARENT', false)).toHaveLength(4);
    expect(getMobileNavItems('PARENT', false).map(item => item.to)).toEqual([
      '/anasayfa', '/destek-ara', '/mesajlar', '/topluluk',
    ]);
  });
});
