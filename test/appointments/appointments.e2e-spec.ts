import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { AppModule } from 'src/app.module';
import { setupBarbershop } from 'src/common/helpers/setupBarbershop';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import request from 'supertest';

describe('Appointments E2E', () => {
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
    await prisma.appointment.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.service.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
    redis = module.get<Redis>(REDIS_CLIENT);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await redis.flushdb();
    await prisma.appointment.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.service.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/appointments/public', () => {
    test('should return 404 if the specified day is not in the barbers schedule', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-10T09:00:00.000Z',
        });

      expect(response.status).toBe(404);
    });

    test('should return 404 if the specified time is not in the barbers schedule', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-10T06:00:00.000Z',
        });

      expect(response.status).toBe(404);
    });

    test('should return 404 if the specified service is not in the barbers services', async () => {
      const { barbershopId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId: barbershopId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-10T09:00:00.000Z',
        });

      expect(response.status).toBe(404);
    });

    test('should return a conflict if two appointments overlap', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      await request(app.getHttpServer()).post('/api/appointments/public').send({
        barbershopId,
        serviceId,
        customerName: 'Will',
        customerPhone: '81998312549',
        date: '2026-09-07T09:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-07T09:00:00.000Z',
        });

      expect(response.status).toBe(409);
    });

    test('Should return appointment created', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-07T09:00:00.000Z',
        });
      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/appointments', () => {
    test('should return 404 if the specified day is not in the barbers schedule', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-08T09:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/appointments/available', () => {
    test('Should return all available time slots for the day', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(200);

      const body = response.body as { available: boolean; slots: string[] };

      expect(body).toHaveProperty('available', true);
      expect(body.slots).toBeInstanceOf(Array);
      expect(body.slots.length).toBeGreaterThan(0);
    });

    test('Should return available false if schedule is not available', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=2026-09-08T00:00:00.000Z`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
    });

    test('Should return available false if barbershop not exist', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=barbershopId-fake&serviceId=serviceId-fake&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
    });

    test('Should return available false if service not exist', async () => {
      const { barbershopId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=serviceId-fake&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    test('Should return `available` (false) if the time does not match the available time.', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=2026-09-08T23:00:00.000Z`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
    });

    test('Should return fewer slots when there is an existing appointment', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: '2026-09-07T08:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(200);

      const body = response.body as { available: boolean; slots: string[] };

      expect(body.available).toBe(true);
      expect(body.slots).not.toContain('08:00');
    });
  });

  describe('GET /api/appointments/available/week', () => {
    test('Should return 7 days', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available/week?barbershopId=${barbershopId}&serviceId=${serviceId}`,
        )
        .expect(200);

      const body = response.body as { available: boolean; slots: string[] };

      expect(body).toHaveLength(7);
    });

    test('Should return available true for monday', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available/week?barbershopId=${barbershopId}&serviceId=${serviceId}`,
        )
        .expect(200);

      const body = response.body as {
        available: boolean;
        dayOfWeek: string;
        slots: string[];
      }[];
      const monday = body.find((day) => day.dayOfWeek === 'MONDAY');

      expect(monday).toBeDefined();
      expect(monday?.available).toBe(true);
      expect(monday?.slots.length).toBeGreaterThan(0);
    });

    test('Should return available false for days without schedule', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available/week?barbershopId=${barbershopId}&serviceId=${serviceId}`,
        )
        .expect(200);

      const body = response.body as {
        available: boolean;
        dayOfWeek?: string;
        reason?: string;
      }[];
      const daysWithoutSchedule = body.filter((day) => !day.available);

      expect(daysWithoutSchedule.length).toBeGreaterThan(0);
      daysWithoutSchedule.forEach((day) => {
        expect(day.reason).toBe('no_schedule');
      });
    });
  });

  describe('GET /api/appointments', () => {
    test('Should return todays appointments', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      const today = new Date();
      today.setUTCHours(9, 0, 0, 0);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: today.toISOString(),
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as { id: string; date: string }[];

      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBeGreaterThan(0);
    });

    test('Should return appointments for a specific date', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: '2026-09-07T09:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get('/api/appointments?date=2026-09-07T00:00:00.000Z')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as { id: string; date: string }[];

      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('service');
      expect(body[0]).toHaveProperty('customer');
    });

    test('Should return empty array if no appointments for the day', async () => {
      const { token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get('/api/appointments?date=2026-09-07T00:00:00.000Z')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as [];
      expect(body).toHaveLength(0);
    });

    test('Should return 401 if not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/appointments').expect(401);
    });
  });

  describe('GET /api/appointments/week', () => {
    test('Should return appointments for the next 7 days', async () => {
      const { serviceId, token } = await setupBarbershop(app);

      const today = new Date();
      today.setUTCHours(9, 0, 0, 0);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: today.toISOString(),
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get('/api/appointments/week')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as { id: string; date: string }[];

      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('service');
      expect(body[0]).toHaveProperty('customer');
    });

    test('Should return empty array if no appointments for the week', async () => {
      const { token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get('/api/appointments/week')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as [];
      expect(body).toHaveLength(0);
    });

    test('Should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/appointments/week')
        .expect(401);
    });
  });
});
