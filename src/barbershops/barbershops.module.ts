import { Module } from '@nestjs/common';
import { BarbershopsService } from './barbershops.service';
import { BarbershopsController } from './barbershops.controller';

@Module({
  controllers: [BarbershopsController],
  providers: [BarbershopsService],
  exports: [BarbershopsService],
})
export class BarbershopsModule {}
