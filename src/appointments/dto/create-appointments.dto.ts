import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentsDto {
  @IsUUID()
  serviceId: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsDateString()
  date: string;
}
