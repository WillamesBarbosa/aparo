import { PrismaService } from 'src/prisma/prisma.service';

export async function createAppointmentDirect(
  prisma: PrismaService,
  data: { barbershopId: string; serviceId: string; date: Date },
) {
  const customer = await prisma.customer.create({
    data: { name: 'João', phone: '81999999999' },
  });

  return prisma.appointment.create({
    data: { ...data, customerId: customer.id, status: 'PENDING' },
  });
}
