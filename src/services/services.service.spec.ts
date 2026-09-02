import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

describe('Schedules service', () => {
  let service: ServicesService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  describe('FindById', () => {
    test('Should return NotFoundException if id not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Update', () => {
    test('Should return NotFoundException if id not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.update('not-exist', { name: 'Fade' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Delete', () => {
    test('Should return NotFoundException if schedule not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.delete('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
