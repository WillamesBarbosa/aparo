import { Injectable } from '@nestjs/common';
import { Schedule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { SchedulesService } from '../schedules/schedules.service';
import { ServicesService } from '../services/services.service';
import { AvailabilityService } from './availability.service';
import { DayOfWeek } from '@prisma/client';
import { CreateAppointmentsDto } from './dto/create-appointments.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointments.dto';
import { CustomerService } from 'src/customer/customers.service';

const DAYS: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly schedulesService: SchedulesService,
    private readonly servicesService: ServicesService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  private async getExistingAppointments(barbershopId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        barbershopId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      include: { service: true },
    });
  }

  async createByBarbershop(barbershopId: string, dto: CreateAppointmentsDto) {
    const appointmentDate = new Date(dto.date);
    const dayOfWeek = DAYS[appointmentDate.getUTCDay()];

    const schedule = await this.schedulesService.findByDay(
      barbershopId,
      dayOfWeek,
    );
    const service = await this.servicesService.findById(dto.serviceId);

    this.availabilityService.validateBusinessHours(
      schedule,
      appointmentDate,
      service.durationMins,
    );

    const customer = await this.customerService.create({
      name: dto.customerName,
      phone: dto.customerPhone,
    });

    return this.prisma.appointment.create({
      data: {
        barbershopId,
        serviceId: dto.serviceId,
        customerId: customer.id,
        date: appointmentDate,
        status: 'PENDING',
      },
      include: { service: true, customer: true, barbershop: true },
    });
  }

  async createPublic(dto: CreatePublicAppointmentDto) {
    const appointmentDate = new Date(dto.date);
    const dayOfWeek = DAYS[appointmentDate.getUTCDay()];

    const schedule = await this.schedulesService.findByDay(
      dto.barbershopId,
      dayOfWeek,
    );

    const service = await this.servicesService.findById(dto.serviceId);
    this.availabilityService.validateBusinessHours(
      schedule,
      appointmentDate,
      service.durationMins,
    );

    const existingAppointments = await this.getExistingAppointments(
      dto.barbershopId,
      appointmentDate,
    );

    this.availabilityService.validateConflicts(
      existingAppointments,
      appointmentDate,
      service.durationMins,
    );

    const customer = await this.customerService.create({
      name: dto.customerName,
      phone: dto.customerPhone,
    });

    return this.prisma.appointment.create({
      data: {
        barbershopId: dto.barbershopId,
        serviceId: dto.serviceId,
        customerId: customer.id,
        date: appointmentDate,
        status: 'PENDING',
      },
      include: { service: true, customer: true, barbershop: true },
    });
  }

  async getAvailableSlots(
    barbershopId: string,
    serviceId: string,
    date: string,
  ) {
    const appointmentDate = new Date(date);
    const dayOfWeek = DAYS[appointmentDate.getUTCDay()];
    // console.log('DATE:', date);
    // console.log('DAY OF WEEK:', dayOfWeek);
    let schedule: Schedule;
    try {
      schedule = await this.schedulesService.findByDay(barbershopId, dayOfWeek);
    } catch {
      return { date, available: false, reason: 'no_schedule', slots: [] };
    }

    if (!schedule.active) {
      return { date, available: false, reason: 'no_schedule', slots: [] };
    }

    const service = await this.servicesService.findById(serviceId);
    const existingAppointments = await this.getExistingAppointments(
      barbershopId,
      appointmentDate,
    );

    const slots = this.availabilityService.generateSlots(
      schedule.openTime,
      schedule.closeTime,
      service.durationMins,
      existingAppointments,
    );

    return {
      date,
      dayOfWeek,
      available: slots.length > 0,
      reason: slots.length === 0 ? 'fully_booked' : null,
      slots,
    };
  }

  async getWeekAvailability(barbershopId: string, serviceId: string) {
    const results: Awaited<ReturnType<typeof this.getAvailableSlots>>[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0);

      const result = await this.getAvailableSlots(
        barbershopId,
        serviceId,
        date.toISOString(),
      );

      results.push(result);
    }
    return results;
  }
}
