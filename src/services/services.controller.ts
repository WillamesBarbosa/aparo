import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { ServicesService } from './services.service';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request.interface';
import { CreateServiceDto } from './dto/create-service.dto';
import { BarbershopsService } from 'src/barbershops/barbershops.service';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly barbershopService: BarbershopsService,
  ) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateServiceDto,
  ) {
    const barbershop = await this.barbershopService.findById(req.user.id);

    return this.servicesService.create(barbershop.id, dto);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const barbershop = await this.barbershopService.findById(req.user.id);

    return this.servicesService.findAll(barbershop.id);
  }

  @Put(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    data: {
      name: string;
      price: number;
      durationMins: number;
      active: boolean;
    },
  ) {
    return this.servicesService.update(id, data);
  }

  @Delete(':id')
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.servicesService.delete(id);
  }
}
