import { describe, expect, it } from 'vitest';
import { normalizeAvailabilitySettings } from '../Availability';

describe('availability settings', () => {
  it('keeps a valid local schedule', () => {
    expect(normalizeAvailabilitySettings({
      workingHoursStart: 8,
      workingHoursEnd: 18,
      slotDuration: 30,
    })).toEqual({ workingHoursStart: 8, workingHoursEnd: 18, slotDuration: 30 });
  });

  it('repairs inverted or out-of-range schedules', () => {
    expect(normalizeAvailabilitySettings({
      workingHoursStart: 20,
      workingHoursEnd: 9,
      slotDuration: 30,
    })).toEqual({ workingHoursStart: 9, workingHoursEnd: 17, slotDuration: 60 });
  });
});
