import { PrismaService } from 'src/prisma/prisma.service';

export async function createAppointmentDirect(
  prisma: PrismaService,
  data: { barbershopId: string; serviceId: string; date: Date },
) {
  const customer = await prisma.customer.upsert({
    where: { phone: '81999999999' },
    update: {},
    create: { name: 'João', phone: '81999999999' },
  });

  return prisma.appointment.create({
    data: { ...data, customerId: customer.id, status: 'PENDING' },
  });
}
