import { PrismaClient } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('Schedules service', () => {
  let service: SchedulesService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  describe('FindByDay', () => {
    test('Should return NotFoundException if schedule not exist', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      await expect(service.findByDay('not-exist', 'MONDAY')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Delete', () => {
    test('Should return NotFoundException if schedule not exist', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      await expect(service.delete('not-exist', 'MONDAY')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
