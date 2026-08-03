import { IsOptional, IsString } from 'class-validator';

export class CreateBarbershopDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}
