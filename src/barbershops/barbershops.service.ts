import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';

@Injectable()
export class BarbershopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBarbershopDto) {
    return this.prisma.barbershop.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async findById(userId: string) {
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { userId },
    });

    if (!barbershop) throw new NotFoundException('Barbershop not found.');

    return barbershop;
  }

  async update(userId: string, dto: UpdateBarbershopDto) {
    await this.findById(userId);

    return this.prisma.barbershop.update({ where: { userId }, data: dto });
  }

  async delete(userId: string) {
    await this.findById(userId);

    return this.prisma.barbershop.delete({ where: { userId } });
  }
}
