import { Test, TestingModule } from '@nestjs/testing';
import { Body, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { registerAndLogin } from 'src/common/helpers/auth-helper';

describe('Barbershop', () => {
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
    await prisma.service.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.service.deleteMany();
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
