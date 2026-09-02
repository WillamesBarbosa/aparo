import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { registerAndLogin } from 'src/common/helpers/auth-helper';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';

describe('', () => {
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
    await prisma.schedule.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
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
  });
});
