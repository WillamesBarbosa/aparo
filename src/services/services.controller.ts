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
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly barbershopService: BarbershopsService,
  ) {}

  //Este id não é do service é do barbershop
  @Get(':id')
  async availableService(@Param('id') id: string) {
    const barbershop = await this.barbershopService.findById(id);

    const services = await this.servicesService.available(id);

    return { barbershop: { name: barbershop.name, services } };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateServiceDto,
  ) {
    const barbershop = await this.barbershopService.findByUserId(req.user.id);

    return this.servicesService.create(barbershop.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: AuthenticatedRequest) {
    const barbershop = await this.barbershopService.findByUserId(req.user.id);

    return this.servicesService.findAll(barbershop.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
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
    const barbershop = await this.barbershopService.findByUserId(req.user.id);

    return this.servicesService.update(barbershop.id, id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const barbershop = await this.barbershopService.findByUserId(req.user.id);

    return this.servicesService.delete(barbershop.id, id);
  }
}
