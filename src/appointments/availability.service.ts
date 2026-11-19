import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Appointment, Schedule, Service } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  private toMinutes(time: string): number {
    const [hour, min] = time.split(':').map(Number);
    return hour * 60 + min;
  }

  private getAppointmentMinutes(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  validateBusinessHours(
    schedule: Schedule,
    appointmentDate: Date,
    durationMins: number,
  ): void {
    if (!schedule.active) {
      throw new BadRequestException('Barbershop is closed on this day');
    }

    const openMinutes = this.toMinutes(schedule.openTime);
    const closeMinutes = this.toMinutes(schedule.closeTime);
    const appointmentMinutes = this.getAppointmentMinutes(appointmentDate);
    const appointmentEndMinutes = appointmentMinutes + durationMins;

    if (
      appointmentMinutes < openMinutes ||
      appointmentEndMinutes > closeMinutes
    ) {
      throw new BadRequestException('Appointment is outside business hours');
    }
  }

  validateConflicts(
    existingAppointments: (Appointment & { service: Service })[],
    appointmentDate: Date,
    durationMins: number,
  ): void {
    const appointmentMinutes = this.getAppointmentMinutes(appointmentDate);
    const appointmentEndMinutes = appointmentMinutes + durationMins;

    for (const existing of existingAppointments) {
      const existingStart = this.getAppointmentMinutes(new Date(existing.date));
      const existingEnd = existingStart + existing.service.durationMins;

      const hasConflict =
        appointmentMinutes < existingEnd &&
        appointmentEndMinutes > existingStart;

      if (hasConflict) {
        throw new ConflictException('Time slot is already taken');
      }
    }
  }

  generateSlots(
    openTime: string,
    closeTime: string,
    durationMins: number,
    existingAppointments: (Appointment & { service: Service })[],
  ): string[] {
    // safeguard against an invalid duration: if it's 0, the while loop below will never terminate
    if (durationMins <= 0) return [];

    const openMinutes = this.toMinutes(openTime);
    const closeMinutes = this.toMinutes(closeTime);

    const blocks = [
      ...existingAppointments.map((appt) => {
        const start = this.getAppointmentMinutes(new Date(appt.date));
        return { start, end: start + appt.service.durationMins };
      }),
      { start: closeMinutes, end: closeMinutes }, // closing sentinel
    ].sort((a, b) => a.start - b.start);

    const slots: string[] = [];
    let cursor = openMinutes; // the day is occupied up to this minute

    for (const block of blocks) {
      // the free gap extends from the cursor to the beginning of the block,
      // but never goes past the closing point
      const limit = Math.min(block.start, closeMinutes);

      let current = cursor;
      while (current + durationMins <= limit) {
        const hour = String(Math.floor(current / 60)).padStart(2, '0');
        const min = String(current % 60).padStart(2, '0');
        slots.push(`${hour}:${min}`);
        current += durationMins;
      }

      // the cursor never moves backward
      cursor = Math.max(cursor, block.end);
    }

    return slots;
  }

  removePastSlots(slots: string[], nowMinutes: number): string[] {
    return slots.filter((slot) => this.toMinutes(slot) > nowMinutes);
  }
}
