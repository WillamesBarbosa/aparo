import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CustomerService } from 'src/customer/customers.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { ServicesService } from 'src/services/services.service';
import { BarbershopsService } from 'src/barbershops/barbershops.service';
import { AvailabilityService } from './availability.service';
import { UsersService } from 'src/users/users.service';

describe('Appointment service', () => {
  let service: AppointmentsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        CustomerService,
        AppointmentsService,
        SchedulesService,
        ServicesService,
        BarbershopsService,
        AvailabilityService,
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  describe('createByBarbershop', () => {
    test('Should return not found if day is not in schedule', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      await expect(
        service.createPublic({
          barbershopId: '1',
          serviceId: '1',
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-08T09:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    test('Should return not found if service is not in services', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.createPublic({
          barbershopId: '1',
          serviceId: '1',
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-08T09:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
  describe('', () => {});
});
