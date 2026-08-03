import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Users (e2e)', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST api/users', () => {
    test('Should create users should create a user and not return the passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          name: 'Will',
          email: 'will@email.com',
          password: '123456',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'will@email.com');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    test('Should return 409 if email already exist', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(409);
    });
  });
  describe('GET api/users/:id', () => {
    test('Should return 404 if users are not found', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(404);
    });

    test('Should return user and not return passwordHash', async () => {
      const post = await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(201);
      const { id } = post.body as { id: string };
      const result = await request(app.getHttpServer())
        .get(`/api/users/${id}`)
        .expect(200);
      expect(result.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('PUT api/users/:id', () => {
    test('if id not exist, return user not found and error 404', async () => {
      await request(app.getHttpServer())
        .put('/api/users/fake-id')
        .send({ name: 'will' })
        .expect(404);
    });

    test('if parameters If no parameter is sent, the user should be returned as-is.', async () => {
      const post = await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(201);
      const { id } = post.body as { id: string };

      const user = await request(app.getHttpServer())
        .put(`/api/users/${id}`)
        .send({})
        .expect(200);

      expect(user.body).toHaveProperty('name', 'Will');
      expect(user.body).toHaveProperty('email', 'will@email.com');
    });
    test('Should return user updated and not return passwordHash', async () => {
      const post = await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(201);
      const { id } = post.body as { id: string };

      const user = await request(app.getHttpServer())
        .put(`/api/users/${id}`)
        .send({ name: 'Edu', email: 'edu@email.com', password: '654321' })
        .expect(200);

      expect(user.body).toHaveProperty('name', 'Edu');
      expect(user.body).toHaveProperty('email', 'edu@email.com');
      expect(user.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('DELETE api/users/:id', () => {
    test('Should return 404 if id not exist', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/fake-id')
        .expect(404);
    });

    test('Should return user deleted and not returne passwordHash', async () => {
      const post = await request(app.getHttpServer())
        .post('/api/users')
        .send({ name: 'Will', email: 'will@email.com', password: '123456' })
        .expect(201);
      const { id } = post.body as { id: string };

      const user = await request(app.getHttpServer())
        .delete(`/api/users/${id}`)
        .expect(200);

      expect(user.body).toHaveProperty('name', 'Will');
      expect(user.body).not.toHaveProperty('passwordHash');
    });
  });
});
