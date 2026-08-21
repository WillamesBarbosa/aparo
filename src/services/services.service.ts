import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(barbershopId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        barbershopId,
        name: dto.name,
        price: dto.price,
        durationMins: dto.durationMins,
        active: dto.active,
      },
    });
  }

  async findAll(barbershopId: string) {
    return this.prisma.service.findMany({
      where: { barbershopId },
    });
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });

    if (!service) throw new NotFoundException('Service not found');

    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findById(id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.service.delete({ where: { id } });
  }
}
