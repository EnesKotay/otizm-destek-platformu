import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '@/utils/internalNavigation';

describe('safeInternalPath', () => {
  it('keeps known routes with query and hash', () => {
    expect(safeInternalPath('/cocuklarim/123?tab=sharing#access'))
      .toBe('/cocuklarim/123?tab=sharing#access');
  });

  it('rejects unknown and external notification targets', () => {
    expect(safeInternalPath('/olmayan-sayfa')).toBe('/bildirimler');
    expect(safeInternalPath('https://example.com')).toBe('/bildirimler');
    expect(safeInternalPath('//example.com/path')).toBe('/bildirimler');
  });
});
