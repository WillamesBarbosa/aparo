const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

export function barbershopNow(now: number = Date.now()): Date {
  return new Date(now - BRAZIL_OFFSET_MS);
}
