import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { SchedulesService } from './schedules.service';
import { BarbershopsService } from 'src/barbershops/barbershops.service';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request.interface';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { DayOfWeek } from '@prisma/client';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly barbershopsServices: BarbershopsService,
  ) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateScheduleDto,
  ) {
    const barbershop = await this.barbershopsServices.findById(req.user.id);
    return this.schedulesService.create(barbershop.id, dto);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const barbershop = await this.barbershopsServices.findById(req.user.id);
    return this.schedulesService.findAll(barbershop.id);
  }

  @Delete(':dayOfWeek')
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
  ) {
    const barbershop = await this.barbershopsServices.findById(req.user.id);
    return this.schedulesService.delete(barbershop.id, dayOfWeek);
  }
}
