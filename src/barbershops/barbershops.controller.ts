import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BarbershopsService } from './barbershops.service';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.interface';

@Controller('barbershops')
@UseGuards(JwtAuthGuard)
export class BarbershopsController {
  constructor(private readonly barbershopsService: BarbershopsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateBarbershopDto,
  ) {
    return this.barbershopsService.create(req.user.id, dto);
  }

  @Get('me')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.barbershopsService.findById(req.user.id);
  }

  @Put('me')
  update(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateBarbershopDto,
  ) {
    return this.barbershopsService.update(req.user.id, dto);
  }

  @Delete('me')
  delete(@Request() req: AuthenticatedRequest) {
    return this.barbershopsService.delete(req.user.id);
  }
}
