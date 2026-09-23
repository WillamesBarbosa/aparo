import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
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

  describe('POST /api/auth/register', () => {
    test('Should register user and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Will',
          email: 'will@email.com',
          password: '123456',
          barbershopName: 'Barbearia do Will',
        })
        .expect(201);

      const body = response.body as {
        user: { id: string; email: string };
        tokens: { accessToken: string; refreshToken: string };
      };
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('tokens');
      expect(body.tokens).toHaveProperty('accessToken');
      expect(body.tokens).toHaveProperty('refreshToken');
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    test('Should return 409 if email already exists', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
        barbershopName: 'Barbearia do Will',
      });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Will',
          email: 'will@email.com',
          password: '123456',
          barbershopName: 'Barbearia do Will',
        })
        .expect(409);
    });

    test('Should return 400 if body is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Will' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('Should login and return tokens', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
        barbershopName: 'Barbearia do Will',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'will@email.com', password: '123456' })
        .expect(201);

      const body = response.body as {
        user: { id: string; email: string };
        tokens: { accessToken: string; refreshToken: string };
      };

      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    test('Should return 401 if credentials are invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'will@email.com', password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('Should return 401 if credentials are invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken:
            'Refresh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTFkMzZkZi01YjhlLTRlMWQtYTdiMi0xOTlhZGVjMThjYWEiLCJlbWFpbCI6IndpbGxAZW1haWwuY29tIiwiaWF0IjoxNzg5Nzc1NTI4LCJleHAiOjE3OTAzODAzMjh9.Pxak7a3dINDeuw10fX_dqXv4xV92jd5bQReZSKngBDo',
        })
        .expect(401);
    });

    test('Should return 200 if credentials are valid', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
        barbershopName: 'Barbearia do Will',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'will@email.com', password: '123456' })
        .expect(201);
      console.log('BODY COMPLETO', JSON.stringify(response.body));
      const body = response.body as {
        accessToken: string;
        refreshToken: string;
      };

      const { refreshToken } = body;
      console.log('VAMOS VAMOS', refreshToken);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: `${refreshToken}`,
        })
        .expect(200);
    });
  });
});
