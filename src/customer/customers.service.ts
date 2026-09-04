import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { phoneValidator } from 'src/common/validators/phoneValidator';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateCustomerDto) {
    const isValidNumber = phoneValidator(dto.phone);
    if (!isValidNumber) throw new BadRequestException();

    return this.prisma.customer.upsert({
      where: { phone: dto.phone },
      update: { name: dto.name },
      create: {
        name: dto.name,
        phone: dto.phone,
      },
    });
  }
}
