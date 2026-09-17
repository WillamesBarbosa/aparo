import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreatePublicAppointmentDto {
  @IsUUID()
  barbershopId: string;

  @IsUUID()
  serviceId: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsDateString()
  date: string;
}
