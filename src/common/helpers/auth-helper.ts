import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const registerAndLogin = async (
  app: INestApplication,
  email = 'will@email.com',
): Promise<string> => {
  const register = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      name: 'Will',
      email,
      password: '123456',
      barbershopName: 'Barbearia do Will',
    });
  expect(register.status).toBe(201);

  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: '123456' });
  expect(response.status).toBe(201); // ajuste se o seu login devolve 200

  return (response.body as { accessToken: string }).accessToken;
};
