import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { BarbershopsService } from './barbershops.service';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('Barbershop service', () => {
  let service: BarbershopsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarbershopsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BarbershopsService>(BarbershopsService);
  });

  describe('FindById', () => {
    test('should throw NotFoundException if the user does not exist', async () => {
      prisma.barbershop.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    test('Should return not found if barbershop not exist', async () => {
      prisma.barbershop.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Delete', () => {
    test('should throw NotFoundException if the barbershop does not exist', async () => {
      prisma.barbershop.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
