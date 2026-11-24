import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DayOfWeek } from '@prisma/client';
import Redis from 'ioredis';
import { AppModule } from 'src/app.module';
import { barbershopNow } from 'src/common/helpers/barbershopNow';
import { createAppointmentDirect } from 'src/common/helpers/createAppointmentDirect';
import { nextMonday, nextWeekday } from 'src/common/helpers/nextMonday';
import { setupBarbershop } from 'src/common/helpers/setupBarbershop';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import request from 'supertest';

describe('Appointments E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  const uuidFake = '639b9b43-428b-4dcd-a8d8-477eeb3d639f';
  const DAYS: DayOfWeek[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
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
    await redis.quit();
    await prisma.$disconnect();
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

  describe('Past dates', () => {
    const oneHourAgo = () =>
      new Date(barbershopNow().getTime() - 60 * 60 * 1000).toISOString();

    test('public: 400 when the date is in the past', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: oneHourAgo(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Appointment date is in the past',
      );
      expect(await prisma.appointment.count()).toBe(0);
    });

    test('authenticated: 400 when the date is in the past', async () => {
      const { serviceId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: oneHourAgo(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Appointment date is in the past',
      );
      expect(await prisma.appointment.count()).toBe(0);
    });
  });
  //Describe a parte, pois é um describe orientado por regra e não por rotas
  describe('Service ownership', () => {
    test('public: 404 when the service belongs to another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId: a.barbershopId,
          serviceId: b.serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextMonday(),
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Service not found');
      expect(await prisma.appointment.count()).toBe(0);
    });

    test('public: 404 when the service is inactive', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      await prisma.service.update({
        where: { id: serviceId },
        data: { active: false },
      });

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextMonday(),
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Service not found');
      expect(await prisma.appointment.count()).toBe(0);
    });

    test('available: 404 when the service belongs to another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${a.barbershopId}&serviceId=${b.serviceId}&date=${nextMonday()}`,
        )
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Service not found');
    });

    test('authenticated: 404 when the service belongs to another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${a.token}`)
        .send({
          serviceId: b.serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextMonday(),
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Service not found');
      expect(await prisma.appointment.count()).toBe(0);
    });
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
          date: nextWeekday(2),
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Schedule not found.');
    });

    test('should return 400 if the specified time is outside business hours', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextMonday(6),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Appointment is outside business hours',
      );
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
          date: nextMonday(),
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Service not found');
    });

    test('should return a conflict if two appointments overlap', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      await request(app.getHttpServer()).post('/api/appointments/public').send({
        barbershopId,
        serviceId,
        customerName: 'Will',
        customerPhone: '81998312549',
        date: nextMonday(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/appointments/public')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextMonday(),
        });

      expect(response.status).toBe(409);
      expect(await prisma.appointment.count()).toBe(1);
      expect(response.body).toHaveProperty(
        'message',
        'Time slot is already taken',
      );
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
          date: nextMonday(),
        });
      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/appointments', () => {
    test('should return 404 if the specified day is not in the barbers schedule', async () => {
      const { serviceId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: nextWeekday(2),
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Schedule not found.');
    });

    test('authenticated: 409 when two appointments overlap', async () => {
      const { serviceId, token } = await setupBarbershop(app);
      const body = {
        serviceId,
        customerName: 'Will',
        customerPhone: '81998312549',
        date: nextMonday(),
      };

      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(409);

      const total = await prisma.appointment.count();
      expect(total).toBe(1);

      const customers = await prisma.customer.count();
      expect(customers).toBe(1);
      expect(response.body).toHaveProperty(
        'message',
        'Time slot is already taken',
      );
    });
  });

  describe('GET /api/appointments/available', () => {
    test('returns past_date for a day before today', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const yesterday = new Date(
        barbershopNow().getTime() - 24 * 60 * 60 * 1000,
      );

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=${yesterday.toISOString()}`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body).toHaveProperty('reason', 'past_date');
      expect(response.body).toHaveProperty('slots', []);
    });

    test('Should return all available time slots for the day', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=${nextMonday()}`,
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
          `/api/appointments/available?barbershopId=${uuidFake}&serviceId=${uuidFake}&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
    });

    test('Should return available bad request if service id is invalid', async () => {
      const { barbershopId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=serviceId-fake&date=2026-09-07T00:00:00.000Z`,
        )
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    test('Should return available false if service not exist', async () => {
      const { barbershopId } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${uuidFake}&date=${nextMonday()}`,
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
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: nextMonday(8),
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=${nextWeekday(8)}`,
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
      const today = barbershopNow();
      today.setUTCHours(9, 0, 0, 0);

      await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: today,
      });

      const response = await request(app.getHttpServer())
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as { id: string; date: string }[];
      expect(body).toHaveLength(1);
    });

    test('Should return appointments for a specific date', async () => {
      const { serviceId, token } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          serviceId,
          customerName: 'João',
          customerPhone: '81999999999',
          date: nextMonday(8),
        })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get(`/api/appointments?date=${nextWeekday(8)}`)
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

    test('uses the barbershop today when date is omitted', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const expected = barbershopNow();
      expected.setUTCHours(0, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}`,
        )
        .expect(200);

      expect(response.body).toHaveProperty('date', expected.toISOString());
    });

    test('returns 400 when date is invalid', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}&date=abc`,
        )
        .expect(400);
    });

    test('removes slots that already passed when the day is today', async () => {
      const { barbershopId, serviceId } = await setupBarbershop(app);
      const now = barbershopNow();
      const dayOfWeek = DAYS[now.getUTCDay()];

      // expediente do dia todo, para o teste valer em qualquer horário
      await prisma.schedule.deleteMany({ where: { barbershopId, dayOfWeek } });
      await prisma.schedule.create({
        data: {
          barbershopId,
          dayOfWeek,
          openTime: '00:00',
          closeTime: '23:59',
          active: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/appointments/available?barbershopId=${barbershopId}&serviceId=${serviceId}`,
        )
        .expect(200);

      const body = response.body as { slots: string[] };
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      expect(body.slots).not.toContain('00:00');
      body.slots.forEach((slot) => {
        const [h, m] = slot.split(':').map(Number);
        expect(h * 60 + m).toBeGreaterThan(nowMinutes);
      });
    });
  });

  describe('GET /api/appointments/week', () => {
    test('Should return appointments for the next 7 days', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const today = barbershopNow();
      today.setUTCHours(9, 0, 0, 0);

      await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: today,
      });

      const response = await request(app.getHttpServer())
        .get('/api/appointments/week')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as { id: string; date: string }[];
      expect(body).toHaveLength(1);
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

    test('returns 7 days starting at from', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const monday = new Date(nextMonday(9));
      const at = (days: number) => {
        const d = new Date(monday);
        d.setUTCDate(d.getUTCDate() + days);
        return d;
      };

      await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: at(0),
      });
      await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: at(6),
      });
      await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: at(7),
      });

      const response = await request(app.getHttpServer())
        .get(`/api/appointments/week?from=${monday.toISOString().slice(0, 10)}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(2); // dia 0 e dia 6; o dia 7 fica de fora
    });

    test.each(['abc', '2026-9-7', '2026-02-31'])(
      'returns 400 for invalid from (%s)',
      async (from) => {
        const { token } = await setupBarbershop(app);

        await request(app.getHttpServer())
          .get(`/api/appointments/week?from=${from}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      },
    );
  });

  describe('PATCH /api/appointments/:id/status', () => {
    const patchStatus = (token: string, id: string, status: string) =>
      request(app.getHttpServer())
        .patch(`/api/appointments/${id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });

    const statusInDb = async (id: string) =>
      (await prisma.appointment.findUnique({ where: { id } }))?.status;

    test('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/appointments/${uuidFake}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(401);
    });

    test('returns 400 for a status that does not exist', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const appt = await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: new Date(nextMonday()),
      });

      await patchStatus(token, appt.id, 'confirmado').expect(400);

      expect(await statusInDb(appt.id)).toBe('PENDING');
    });

    test('returns 404 for an appointment from another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');
      const appt = await createAppointmentDirect(prisma, {
        barbershopId: b.barbershopId,
        serviceId: b.serviceId,
        date: new Date(nextMonday()),
      });

      const response = await patchStatus(a.token, appt.id, 'CANCELLED');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Appointment not found');
      expect(await statusInDb(appt.id)).toBe('PENDING');
    });

    test('returns 400 when trying to reactivate a cancelled appointment', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const appt = await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: new Date(nextMonday()),
      });

      await patchStatus(token, appt.id, 'CANCELLED').expect(200);

      const response = await patchStatus(token, appt.id, 'CONFIRMED');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Cannot change status from CANCELLED to CONFIRMED',
      );
      expect(await statusInDb(appt.id)).toBe('CANCELLED');
    });

    test('follows PENDING, CONFIRMED, COMPLETED and then stops', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const appt = await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: new Date(nextMonday()),
      });

      const confirmed = await patchStatus(token, appt.id, 'CONFIRMED').expect(
        200,
      );
      expect(confirmed.body).toHaveProperty('status', 'CONFIRMED');
      expect(confirmed.body).toHaveProperty('service');
      expect(confirmed.body).toHaveProperty('customer');

      await patchStatus(token, appt.id, 'COMPLETED').expect(200);
      expect(await statusInDb(appt.id)).toBe('COMPLETED');

      // concluído é um estado final: não pode ser cancelado
      await patchStatus(token, appt.id, 'CANCELLED').expect(400);
      expect(await statusInDb(appt.id)).toBe('COMPLETED');
    });

    test('allows completing a pending appointment directly', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);
      const appt = await createAppointmentDirect(prisma, {
        barbershopId,
        serviceId,
        date: new Date(nextMonday()),
      });

      await patchStatus(token, appt.id, 'COMPLETED').expect(200);

      expect(await statusInDb(appt.id)).toBe('COMPLETED');
    });

    test('frees the time slot after cancelling, so it can be booked again', async () => {
      const { serviceId, token } = await setupBarbershop(app);
      const body = {
        serviceId,
        customerName: 'Will',
        customerPhone: '81998312549',
        date: nextMonday(),
      };

      const first = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(201);

      // enquanto está ativo, o horário está ocupado
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(409);

      const { id } = first.body as { id: string };
      await patchStatus(token, id, 'CANCELLED').expect(200);

      // depois de cancelado, o mesmo horário volta a aceitar agendamento
      await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(201);

      expect(await prisma.appointment.count()).toBe(2);
      expect(
        await prisma.appointment.count({ where: { status: 'CANCELLED' } }),
      ).toBe(1);
    });
  });
});
