import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  durationMins?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
