import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET api/barbershop/me', () => {
    test('Should return 401 if token is invalid or not exist', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/barbershops/me',
      );

      expect(response.status).toEqual(401);
    });

    test('should return 404 if barbershop not exist', async () => {
      await request(app.getHttpServer()).post('/api/users').send({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
      });

      const token = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'will@email.com',
          password: '123456',
        });
      const { accessToken } = token.body as { accessToken: string };

      const response = await request(app.getHttpServer())
        .get('/api/barbershops/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toEqual(404);
    });

    test('Should return barbershop', async () => {
      const token = await registerAndLogin(app);

      const response = await request(app.getHttpServer())
        .get('/api/barbershops/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Barbearia do Will');
    });
  });

  describe('POST /api/barbershop', () => {
    test('Should return barbershop created', async () => {
      await request(app.getHttpServer()).post('/api/users').send({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
      });

      const token = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'will@email.com',
          password: '123456',
        });
      const { accessToken } = token.body as { accessToken: string };

      const response = await request(app.getHttpServer())
        .post('/api/barbershops')
        .send({ name: 'Barbearia do Will' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'Barbearia do Will');
      expect(response.body).toHaveProperty('userId');
    });
  });

  describe('Put api/barbershop/me', () => {
    test('Should return 401', async () => {
      const response = await request(app.getHttpServer()).put(
        '/api/barbershops/me',
      );

      expect(response.status).toEqual(401);
    });

    test('Should return barbershop updated', async () => {
      const token = await registerAndLogin(app);

      const response = await request(app.getHttpServer())
        .put('/api/barbershops/me')
        .send({ name: 'Barbearia do Jaime' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Barbearia do Jaime');
    });
  });

  describe('Delete api/barbershop/me', () => {
    test('Should return 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/barbershops/me',
      );

      expect(response.status).toEqual(401);
    });

    test('Should return barbershop deleted', async () => {
      const token = await registerAndLogin(app);

      const response = await request(app.getHttpServer())
        .delete('/api/barbershops/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Barbearia do Will');
    });
  });
});
