import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AvailableSlotsQueryDto {
  @IsUUID()
  barbershopId: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
