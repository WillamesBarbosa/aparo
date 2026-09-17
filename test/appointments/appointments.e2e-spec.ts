import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { setupBarbershop } from 'src/common/helpers/setupBarbershop';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

describe('Appointments E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
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

    test('should return 404 if the specified service is not in the barbers services', async () => {
      const { barbershopId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId: barbershopId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-08T09:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    test('should return 404 if the specified time is not in the barbers schedule', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-08T06:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    test('Should return appointment created', async () => {
      const { barbershopId, serviceId, token } = await setupBarbershop(app);

      const response = await request(app.getHttpServer())
        .post('/api/appointments')
        .send({
          barbershopId,
          serviceId,
          customerName: 'Will',
          customerPhone: '81998312549',
          date: '2026-09-07T09:00:00.000Z',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
    });
  });
});
