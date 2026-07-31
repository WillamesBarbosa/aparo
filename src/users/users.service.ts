import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { sanitize } from 'src/common/utils/sanitize';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    return sanitize(user, ['passwordHash']);
  }

  async create(dto: RegisterDto) {
    const userAlreadyExisting = await this.findByEmail(dto.email);
    if (userAlreadyExisting)
      throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    });

    return sanitize(user, ['passwordHash']);
  }

  async update(
    id: string,
    data: { name?: string; email?: string; password?: string },
  ) {
    await this.findById(id);

    const updateData: { name?: string; email?: string; passwordHash?: string } =
      {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password)
      updateData.passwordHash = await bcrypt.hash(data.password, 10);

    const userUpdated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return sanitize(userUpdated, ['passwordHash']);
  }

  async delete(id: string) {
    await this.findById(id);

    const user = await this.prisma.user.delete({ where: { id } });

    return sanitize(user, ['passwordHash']);
  }
}
