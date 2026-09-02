import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(barbershopId: string, dto: CreateScheduleDto) {
    return this.prisma.schedule.upsert({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      update: {
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        active: dto.active,
      },
      create: {
        barbershopId,
        dayOfWeek: dto.dayOfWeek,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        active: dto.active,
      },
    });
  }

  async findAll(barbershopId: string) {
    return this.prisma.schedule.findMany({
      where: { barbershopId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findByDay(barbershopId: string, dayOfWeek: DayOfWeek) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { barbershopId_dayOfWeek: { barbershopId, dayOfWeek } },
    });

    if (!schedule) throw new NotFoundException('Schedule not found.');

    return schedule;
  }

  async delete(barbershopId: string, dayOfWeek: DayOfWeek) {
    await this.findByDay(barbershopId, dayOfWeek);

    return this.prisma.schedule.delete({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId,
          dayOfWeek,
        },
      },
    });
  }
}
