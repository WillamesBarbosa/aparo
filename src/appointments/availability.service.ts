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
}
