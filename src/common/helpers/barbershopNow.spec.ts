import { barbershopNow } from './barbershopNow';

test('00:30Z do dia 7 vira 21:30 do dia 6', () => {
  const result = barbershopNow(Date.parse('2026-11-07T00:30:00.000Z'));

  expect(result.toISOString()).toBe('2026-11-06T21:30:00.000Z');
});
