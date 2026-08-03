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
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { BarbershopsService } from './barbershops.service';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@Controller('barbershops')
@UseGuards(LocalAuthGuard)
export class BarbershopsController {
  constructor(private readonly barbershopsService: BarbershopsService) {}

  @Post('me')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateBarbershopDto,
  ) {
    return this.barbershopsService.create(req.user.id, dto);
  }

  @Get()
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

  @Delete()
  delete(@Request() req: AuthenticatedRequest) {
    return this.barbershopsService.delete(req.user.id);
  }
}
