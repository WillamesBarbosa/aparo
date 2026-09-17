import { Injectable } from '@nestjs/common';
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
}
