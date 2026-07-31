import { PrismaClient } from '@prisma/client';
import { UsersService } from './users.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { makeMockUser } from 'src/common/makeMockUser';

describe('UserService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('FindById', () => {
    test('should throw NotFoundException if the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    test('Should return the user without the hashPassword', async () => {
      prisma.user.findUnique.mockResolvedValue(makeMockUser());

      const result = await service.findById('1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', '1');
    });
  });

  describe('Create', () => {
    test('Should return 400 and Email already exist', async () => {
      prisma.user.findUnique.mockResolvedValue(makeMockUser());

      await expect(
        service.create({
          name: 'name',
          email: 'email@email.com',
          password: '123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    test('Should return user created whithout password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeMockUser());

      const result = await service.create({
        name: 'Will',
        email: 'will@email.com',
        password: 'hash123',
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', '1');
    });
  });

  describe('Update', () => {
    test('should throw NotFoundException if the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    test('Should return user updated', async () => {
      prisma.user.findUnique.mockResolvedValue(makeMockUser());
      prisma.user.update.mockResolvedValue(makeMockUser({ name: 'edu' }));

      const result = await service.update('1', { name: 'edu' });

      expect(result).toHaveProperty('name', 'edu');
      expect(result).not.toHaveProperty('passwordHash'); // faltou isso
    });
  });

  describe('Delete', () => {
    test('should throw NotFoundException if the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    test('Should return deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeMockUser());
      prisma.user.delete.mockResolvedValue(makeMockUser());

      const result = await service.delete('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).not.toHaveProperty('passwordHash'); // faltou isso
    });
  });
});
