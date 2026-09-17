import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AvailabilityService } from './availability.service';
import { BarbershopsModule } from '../barbershops/barbershops.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { ServicesModule } from '../services/services.module';
import { CustomersModule } from 'src/customer/customers.module';

@Module({
  imports: [
    BarbershopsModule,
    SchedulesModule,
    ServicesModule,
    CustomersModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
