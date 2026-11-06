import { Test, TestingModule } from '@nestjs/testing';
import { Body, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { registerAndLogin } from 'src/common/helpers/auth-helper';
import { setupBarbershop } from 'src/common/helpers/setupBarbershop';

describe('Services', () => {
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

  describe('POST /api/services', () => {
    test('Should return services created', async () => {
      const token = await registerAndLogin(app);

      const response = await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade', price: 44.9, durationMins: 45 })
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toHaveProperty('price', '44.9');
    });

    test('Should return 401 if token is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade', price: 44.9, durationMins: 45 })
        .set('Authorization', `Bearer fake-token`)
        .expect(401);
    });
  });

  describe('GET /api/services/:id (pública)', () => {
    test('returns barbershop name and only active services', async () => {
      const { token, barbershopId, serviceId } = await setupBarbershop(app);
      //Por padrão já vem um Fade ativo no setupBarbershop
      await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade 2', price: 44.9, durationMins: 45, active: false })
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app.getHttpServer())
        .get(`/api/services/${barbershopId}`)
        .expect(200);
      const body = res.body as {
        barbershop: Record<string, unknown>;
        services: { id: string }[];
      };

      expect(body.services).toHaveLength(1);
      expect(body.services[0].id).toBe(serviceId);
      expect(body.barbershop).toHaveProperty('name');
      expect(body.barbershop).not.toHaveProperty('userId');
    });

    test('returns 404 for unknown barbershop', async () => {
      await request(app.getHttpServer())
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PUT /api/services/:id', () => {
    test('returns 401 without token', async () => {
      const { serviceId } = await setupBarbershop(app);

      await request(app.getHttpServer())
        .put(`/api/services/${serviceId}`)
        .send({ name: 'Hack' })
        .expect(401);
    });

    test('returns 404 and does not change a service from another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      await request(app.getHttpServer())
        .put(`/api/services/${b.serviceId}`)
        .set('Authorization', `Bearer ${a.token}`)
        .send({ name: 'Hack' })
        .expect(404);

      const untouched = await prisma.service.findUnique({
        where: { id: b.serviceId },
      });
      expect(untouched?.name).not.toBe('Hack');
    });

    test('rejects barbershopId in the body', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      await request(app.getHttpServer())
        .put(`/api/services/${a.serviceId}`)
        .set('Authorization', `Bearer ${a.token}`)
        .send({ barbershopId: b.barbershopId })
        .expect(400);
    });
  });

  describe('DELETE /api/services/:id', () => {
    test('returns 404 and keeps a service from another barbershop', async () => {
      const a = await setupBarbershop(app, 'a@test.com');
      const b = await setupBarbershop(app, 'b@test.com');

      await request(app.getHttpServer())
        .delete(`/api/services/${b.serviceId}`)
        .set('Authorization', `Bearer ${a.token}`)
        .expect(404);

      const stillThere = await prisma.service.findUnique({
        where: { id: b.serviceId },
      });
      expect(stillThere).not.toBeNull();
    });
  });

  describe('Get api/services', () => {
    test('Should return 401 if token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/api/services')
        .set('Authorization', `Bearer fake-token`)
        .expect(401);
    });

    test('Should return all services', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade', price: 44.9, durationMins: 45 })
        .set('Authorization', `Bearer ${token}`);

      await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Barber', price: 34.9, durationMins: 45 })
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .get('/api/services')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('Put /api/services/:id', () => {
    test('Should return 401 if token is invalid', async () => {
      await request(app.getHttpServer())
        .put(`/api/services/mock-id}`)
        .send({ name: 'Flattop' })
        .set('Authorization', `Bearer fake-token`)
        .expect(401);
    });
    test('Should return 404 if id not exist', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .put(`/api/services/fake-id`)
        .send({ name: 'Flattop' })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    test('Should return service updated', async () => {
      const token = await registerAndLogin(app);

      const service = await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade', price: 44.9, durationMins: 45 })
        .set('Authorization', `Bearer ${token}`);

      const { id } = service.body as { id: string };

      const response = await request(app.getHttpServer())
        .put(`/api/services/${id}`)
        .send({ name: 'Flattop' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toHaveProperty('name', 'Flattop');
    });
  });

  describe('Delete /api/services/:id', () => {
    test('Should return 401 if token is invalid', async () => {
      await request(app.getHttpServer())
        .delete(`/api/services/mock-id`)
        .set('Authorization', `Bearer fake-token`)
        .expect(401);
    });

    test('Should return 404 if id not exist', async () => {
      const token = await registerAndLogin(app);

      await request(app.getHttpServer())
        .delete(`/api/services/fake-id`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    test('Should return service deleted', async () => {
      const token = await registerAndLogin(app);

      const service = await request(app.getHttpServer())
        .post('/api/services')
        .send({ name: 'Fade', price: 44.9, durationMins: 45 })
        .set('Authorization', `Bearer ${token}`);

      const { id } = service.body as { id: string };

      const response = await request(app.getHttpServer())
        .delete(`/api/services/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.body).toHaveProperty('name', 'Fade');
    });
  });
});
