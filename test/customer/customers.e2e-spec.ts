import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import request from 'supertest';
import { PrismaService } from 'src/prisma/prisma.service';

describe('Customer', () => {
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
    await prisma.customer.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.customer.deleteMany();
  });

  describe('POST /api/customers', () => {
    test('Should return Bad request if phone number are invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          name: 'Will',
          phone: 'invalid',
        })
        .expect(400);

      // only 10 numbers
      await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          name: 'Will',
          phone: '8195310058',
        })
        .expect(400);
    });

    test('Should return customer', async () => {
      await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          name: 'Will',
          phone: '81998312549',
        })
        .expect(201);
    });

    test('Should return the client with the updated name if the number already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          name: 'Will',
          phone: '81998312549',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/customers')
        .send({
          name: 'Jaime',
          phone: '81998312549',
        })
        .expect(201);

      expect(response.body).toHaveProperty('name', 'Jaime');
    });
  });
});
