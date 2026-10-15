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
    const openMinutes = this.toMinutes(openTime);
    const closeMinutes = this.toMinutes(closeTime);

    const blocks = [
      { start: openMinutes, end: openMinutes },
      ...existingAppointments.map((appt) => {
        const start = this.getAppointmentMinutes(new Date(appt.date));
        return { start: start, end: start + appt.service.durationMins };
      }),
      { start: closeMinutes, end: closeMinutes },
    ].sort((a, b) => a.start - b.start);

    const slots: string[] = [];

    for (let i = 0; i < blocks.length - 1; i++) {
      const startSpace = blocks[i].end;
      const endSpace = blocks[i + 1].start;
      const avaiableSpace = endSpace - startSpace;

      if (avaiableSpace < durationMins) continue;

      let current = startSpace;
      while (current + durationMins <= endSpace) {
        const hour = String(Math.floor(current / 60)).padStart(2, '0');
        const min = String(current % 60).padStart(2, '0');
        slots.push(`${hour}:${min}`);
        current += durationMins;
      }
    }

    return slots;
  }
}
