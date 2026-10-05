// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatLocalDate, formatTime } from '@/utils/date';

declare const process: { env: { TZ?: string } };

describe('date utils', () => {
  it('formatLocalDate: UTC gece sınırında yerel takvim gününü kullanır', () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'Europe/Istanbul';
    try {
      expect(formatLocalDate(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05');
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });
  it('formatDate: ISO tarihini Türkçe biçime çevirir', () => {
    expect(formatDate('2026-06-03T10:00:00')).toBe('3 Haziran 2026');
  });

  it('formatDate: Ocak ayı doğru formatlanır', () => {
    expect(formatDate('2026-01-01T00:00:00')).toBe('1 Ocak 2026');
  });

  it('formatDateTime: tarih ve saat birlikte döner', () => {
    expect(formatDateTime('2026-06-03T14:30:00')).toBe('3 Haziran 2026 14:30');
  });

  it('formatTime: sadece saat kısmı döner', () => {
    expect(formatTime('2026-06-03T09:05:00')).toBe('09:05');
  });

  it('formatTime: gece yarısı doğru döner', () => {
    expect(formatTime('2026-01-15T00:00:00')).toBe('00:00');
  });
});
