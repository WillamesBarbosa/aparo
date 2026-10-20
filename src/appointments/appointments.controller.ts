import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { BarbershopsService } from '../barbershops/barbershops.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { CreateAppointmentsDto } from './dto/create-appointments.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointments.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly barbershopsService: BarbershopsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createByBarbershop(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateAppointmentsDto,
  ) {
    const barbershop = await this.barbershopsService.findById(req.user.id);
    return this.appointmentsService.createByBarbershop(barbershop.id, dto);
  }

  @Post('public')
  async createPublic(@Body() dto: CreatePublicAppointmentDto) {
    return this.appointmentsService.createPublic(dto);
  }

  @Get('available')
  async getAvailableSlots(
    @Query('barbershopId') barbeshopId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      barbeshopId,
      serviceId,
      date,
    );
  }

  @Get('available/week')
  async getWeekAvailability(
    @Query('barbershopId') barbershopId: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.appointmentsService.getWeekAvailability(
      barbershopId,
      serviceId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByDay(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ) {
    const barbershop = await this.barbershopsService.findById(req.user.id);
    return this.appointmentsService.findByDay(barbershop.id, date);
  }

  @Get('week')
  @UseGuards(JwtAuthGuard)
  async findWeek(@Request() req: AuthenticatedRequest) {
    const barbershop = await this.barbershopsService.findById(req.user.id);
    return this.appointmentsService.findWeek(barbershop.id);
  }
}
