import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const registerAndLogin = async (
  app: INestApplication,
): Promise<string> => {
  await request(app.getHttpServer()).post('/api/auth/register').send({
    name: 'Will',
    email: 'will@email.com',
    password: '123456',
    barbershopName: 'Barbearia do Will',
  });

  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: 'will@email.com', password: '123456' });

  return (response.body as { accessToken: string }).accessToken;
};
