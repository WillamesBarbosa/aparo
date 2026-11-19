import { AvailabilityService } from './availability.service';

const service = new AvailabilityService();
describe('AvailabilityService.generateSlots', () => {
  // creates a dummy schedule containing only what generateSlots reads
  const appt = (start: string, durationMins: number) =>
    ({
      date: new Date(`2026-11-16T${start}:00.000Z`),
      service: { durationMins },
    }) as never;

  test('does not offer slots inside an overlapping appointment', () => {
    const slots = service.generateSlots('08:00', '18:00', 30, [
      appt('09:00', 120),
      appt('09:30', 30),
    ]);

    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('10:30');
    expect(slots).toContain('11:00');
  });

  test('does not offer slots after closing time', () => {
    const slots = service.generateSlots('08:00', '18:00', 30, [
      appt('18:30', 30),
    ]);

    expect(slots).not.toContain('18:00');
    expect(slots.at(-1)).toBe('17:30');
  });

  test('returns no slots when duration is zero or negative', () => {
    expect(service.generateSlots('08:00', '18:00', 0, [])).toEqual([]);
    expect(service.generateSlots('08:00', '18:00', -30, [])).toEqual([]);
  });
});

describe('AvailabilityService.removePastSlots', () => {
  const slots = ['08:00', '09:00', '10:00'];

  test('Should remove slots that start before now', () => {
    const minuteNow = 9 * 60 + 30;
    expect(service.removePastSlots(slots, minuteNow)).toEqual(['10:00']);
  });

  test('Should remove a slot that starts exactly now', () => {
    const minuteNow = 9 * 60;
    expect(service.removePastSlots(slots, minuteNow)).toEqual(['10:00']);
  });

  test('Should keep all slots when none has passed', () => {
    const minuteNow = 7 * 60;
    expect(service.removePastSlots(slots, minuteNow)).toEqual(slots);
  });

  test('Should returns an empty list when every slot has passed', () => {
    const minuteNow = 18 * 60;
    expect(service.removePastSlots(slots, minuteNow)).toEqual([]);
  });
});
