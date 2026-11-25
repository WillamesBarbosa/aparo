import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { AppModule } from 'src/app.module';
import { registerAndLogin } from 'src/common/helpers/auth-helper';
import { setupBarbershop } from 'src/common/helpers/setupBarbershop';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import request from 'supertest';

describe('', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.service.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
    redis = module.get<Redis>(REDIS_CLIENT);
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.service.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/schedules', () => {
    test('Should return schedule created', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .post('/api/schedules')
        .send({
          dayOfWeek: 'MONDAY',
          openTime: '10:00',
          closeTime: '18:00',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });

    test.each([
      ['opening after closing', '18:00', '08:00'],
      ['opening equal to closing', '09:00', '09:00'],
    ])('returns 400 for %s', async (_label, openTime, closeTime) => {
      const { barbershopId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({ dayOfWeek: 'TUESDAY', openTime, closeTime });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'openTime must be before closeTime',
      );

      // nada foi gravado para terça (o setup só criou segunda)
      expect(
        await prisma.schedule.count({
          where: { barbershopId, dayOfWeek: 'TUESDAY' },
        }),
      ).toBe(0);
    });
  });

  describe('GET /api/schedules', () => {
    test('Should return schedules', async () => {
      const token = await registerAndLogin(app);
      await request(app.getHttpServer())
        .post('/api/schedules')
        .send({
          dayOfWeek: 'MONDAY',
          openTime: '10:00',
          closeTime: '18:00',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as {
        dayOfWeek: string;
        openTime: string;
        closeTime: string;
      }[];

      expect(body[0]).toHaveProperty('dayOfWeek', 'MONDAY');
    });
  });

  describe('DELETE /api/schedules', () => {
    test('should return 404 if the day is not passed as a parameter or if the day does not exist in the database', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .delete('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      await request(app.getHttpServer())
        .delete('/api/schedules/MONDAY')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    test('Should return schedule deleted', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .post('/api/schedules')
        .send({
          dayOfWeek: 'MONDAY',
          openTime: '10:00',
          closeTime: '18:00',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .delete('/api/schedules/MONDAY')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toHaveProperty('dayOfWeek', 'MONDAY');
    });

    test('returns 400 for a day that does not exist', async () => {
      const { token } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .delete('/api/schedules/FUNDAY')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    test('deletes only the schedule of the logged barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      // as duas barbearias têm agenda de segunda, criada pelo setup
      await request(app.getHttpServer())
        .delete('/api/schedules/MONDAY')
        .set('Authorization', `Bearer ${a.token}`)
        .expect(200);

      expect(
        await prisma.schedule.count({
          where: { barbershopId: a.barbershopId },
        }),
      ).toBe(0);
      expect(
        await prisma.schedule.count({
          where: { barbershopId: b.barbershopId },
        }),
      ).toBe(1);
    });
  });
});
