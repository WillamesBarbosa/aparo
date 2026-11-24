import { BadRequestException, Injectable } from '@nestjs/common';
import { Schedule, Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { SchedulesService } from '../schedules/schedules.service';
import { ServicesService } from '../services/services.service';
import { AvailabilityService } from './availability.service';
import { DayOfWeek } from '@prisma/client';
import { CreateAppointmentsDto } from './dto/create-appointments.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointments.dto';
import { CustomerService } from 'src/customer/customers.service';
import { barbershopNow } from 'src/common/helpers/barbershopNow';

const DAYS: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

type AppointmentInput = Pick<
  CreateAppointmentsDto,
  'customerName' | 'customerPhone' | 'date'
>;
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

  private resolveStartOfDay(from?: string): Date {
    const start = from ? new Date(`${from}T00:00:00.000Z`) : barbershopNow();

    if (
      Number.isNaN(start.getTime()) ||
      (from && start.toISOString().slice(0, 10) !== from)
    ) {
      throw new BadRequestException('Invalid date');
    }

    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  private async createAppointment(
    barbershopId: string,
    input: AppointmentInput,
    service: Service,
  ) {
    const appointmentDate = new Date(input.date);
    if (appointmentDate.getTime() <= barbershopNow().getTime()) {
      throw new BadRequestException('Appointment date is in the past');
    }
    const dayOfWeek = DAYS[appointmentDate.getUTCDay()];

    const schedule = await this.schedulesService.findByDay(
      barbershopId,
      dayOfWeek,
    );

    this.availabilityService.validateBusinessHours(
      schedule,
      appointmentDate,
      service.durationMins,
    );

    const existingAppointments = await this.getExistingAppointments(
      barbershopId,
      appointmentDate,
    );

    this.availabilityService.validateConflicts(
      existingAppointments,
      appointmentDate,
      service.durationMins,
    );

    const customer = await this.customerService.create({
      name: input.customerName,
      phone: input.customerPhone,
    });

    return this.prisma.appointment.create({
      data: {
        barbershopId,
        serviceId: service.id,
        customerId: customer.id,
        date: appointmentDate,
        status: 'PENDING',
      },
      include: { service: true, customer: true, barbershop: true },
    });
  }

  async createByBarbershop(barbershopId: string, dto: CreateAppointmentsDto) {
    const service = await this.servicesService.findOwned(
      dto.serviceId,
      barbershopId,
    );

    return this.createAppointment(barbershopId, dto, service);
  }

  async createPublic(dto: CreatePublicAppointmentDto) {
    const service = await this.servicesService.findActiveOwned(
      dto.serviceId,
      dto.barbershopId,
    );

    return this.createAppointment(dto.barbershopId, dto, service);
  }

  async getAvailableSlots(
    barbershopId: string,
    serviceId: string,
    date?: string,
  ) {
    const appointmentDate = date ? new Date(date) : barbershopNow();
    appointmentDate.setUTCHours(0, 0, 0, 0);

    const todayStart = barbershopNow();
    todayStart.setUTCHours(0, 0, 0, 0);

    const dateIso = appointmentDate.toISOString();
    const dayOfWeek = DAYS[appointmentDate.getUTCDay()];

    if (appointmentDate.getTime() < todayStart.getTime()) {
      return {
        date: dateIso,
        available: false,
        reason: 'past_date',
        slots: [],
      };
    }

    let schedule: Schedule;

    try {
      schedule = await this.schedulesService.findByDay(barbershopId, dayOfWeek);
    } catch {
      return {
        date: dateIso,
        available: false,
        reason: 'no_schedule',
        slots: [],
      };
    }

    if (!schedule.active) {
      return {
        date: dateIso,
        available: false,
        reason: 'no_schedule',
        slots: [],
      };
    }

    const service = await this.servicesService.findActiveOwned(
      serviceId,
      barbershopId,
    );
    const existingAppointments = await this.getExistingAppointments(
      barbershopId,
      appointmentDate,
    );

    let slots = this.availabilityService.generateSlots(
      schedule.openTime,
      schedule.closeTime,
      service.durationMins,
      existingAppointments,
    );

    if (appointmentDate.getTime() === todayStart.getTime()) {
      const now = barbershopNow();
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      slots = this.availabilityService.removePastSlots(slots, nowMinutes);
    }

    return {
      date: dateIso,
      dayOfWeek,
      available: slots.length > 0,
      reason: slots.length === 0 ? 'fully_booked' : null,
      slots,
    };
  }

  async getWeekAvailability(barbershopId: string, serviceId: string) {
    const results: Awaited<ReturnType<typeof this.getAvailableSlots>>[] = [];
    const today = barbershopNow();

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

  async findByDay(barbershopId: string, date?: string) {
    const targetDate = date ? new Date(date) : barbershopNow();

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        barbershopId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: 'asc' },
      include: {
        service: true,
        customer: true,
      },
    });
  }

  async findWeek(barbershopId: string, from?: string) {
    const startOfWeek = this.resolveStartOfDay(from);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        barbershopId,
        date: { gte: startOfWeek, lte: endOfWeek },
      },
      orderBy: { date: 'asc' },
      include: {
        service: true,
        customer: true,
      },
    });
  }
}
