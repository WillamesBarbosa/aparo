import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CustomerService } from './customers.service';

describe('Schedules service', () => {
  let service: CustomerService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('FindByDay', () => {
    test('Should return NotFoundException if schedule not exist', async () => {
      await expect(
        service.create({ name: 'Will', phone: 'Invalid' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
