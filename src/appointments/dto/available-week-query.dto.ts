import { IsUUID } from 'class-validator';

export class AvailableWeekQueryDto {
  @IsUUID()
  barbershopId: string;

  @IsUUID()
  serviceId: string;
}
