import { INestApplication } from '@nestjs/common';
import { registerAndLogin } from './auth-helper';
import request from 'supertest';

export const setupBarbershop = async (app: INestApplication) => {
  const token = await registerAndLogin(app);

  const serviceResponse = await request(app.getHttpServer())
    .post('/api/services')
    .send({ name: 'Fade', price: 44.9, durationMins: 45 })
    .set('Authorization', `Bearer ${token}`);

  await request(app.getHttpServer())
    .post('/api/schedules')
    .send({ dayOfWeek: 'MONDAY', openTime: '08:00', closeTime: '18:00' })
    .set('Authorization', `Bearer ${token}`);

  const barbershopResponse = await request(app.getHttpServer())
    .get('/api/barbershops/me')
    .set('Authorization', `Bearer ${token}`);

  const { id: barbershopId } = barbershopResponse.body as { id: string };
  const { id: serviceId } = serviceResponse.body as { id: string };

  return { token, barbershopId, serviceId };
};
