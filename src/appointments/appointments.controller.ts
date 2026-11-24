import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { WeekQueryDto } from './dto/week-query.dto';
import { AvailableWeekQueryDto } from './dto/available-week-query.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly barbershopsService: BarbershopsService,
  ) {}

  // POSTS
  @Post()
  @UseGuards(JwtAuthGuard)
  async createByBarbershop(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateAppointmentsDto,
  ) {
    const barbershop = await this.barbershopsService.findByUserId(req.user.id);
    return this.appointmentsService.createByBarbershop(barbershop.id, dto);
  }

  @Post('public')
  async createPublic(@Body() dto: CreatePublicAppointmentDto) {
    return this.appointmentsService.createPublic(dto);
  }

  //GETS

  @Get('available')
  async getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
    return this.appointmentsService.getAvailableSlots(
      query.barbershopId,
      query.serviceId,
      query.date,
    );
  }

  @Get('available/week')
  async getWeekAvailability(@Query() query: AvailableWeekQueryDto) {
    return this.appointmentsService.getWeekAvailability(
      query.barbershopId,
      query.serviceId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByDay(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ) {
    const barbershop = await this.barbershopsService.findByUserId(req.user.id);
    return this.appointmentsService.findByDay(barbershop.id, date);
  }

  @Get('week')
  @UseGuards(JwtAuthGuard)
  async findWeek(
    @Request() req: AuthenticatedRequest,
    @Query() query: WeekQueryDto,
  ) {
    const barbershop = await this.barbershopsService.findByUserId(req.user.id);
    return this.appointmentsService.findWeek(barbershop.id, query.from);
  }

  //PATCHS

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateAppointmentStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    const barbershop = await this.barbershopsService.findByUserId(req.user.id);

    return this.appointmentsService.updateAppointmentStatus(
      id,
      barbershop.id,
      dto,
    );
  }
}
