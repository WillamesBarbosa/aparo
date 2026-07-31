import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { makeMockUser } from 'src/common/makeMockUser';
import * as bcrypt from 'bcrypt';

let service: AuthService;
let usersService: DeepMockProxy<UsersService>;
let jwtService: DeepMockProxy<JwtService>;
let configService: DeepMockProxy<ConfigService>;

describe('ValidateUser and Login', () => {
  beforeEach(async () => {
    usersService = mockDeep<UsersService>();
    jwtService = mockDeep<JwtService>();
    configService = mockDeep<ConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  test('Should return null if email not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    const user = makeMockUser();

    const result = await service.validateUser(user.email, user.passwordHash);

    expect(result).toBe(null);
  });

  test('Should return null if password is incorrect', async () => {
    const user = makeMockUser();
    usersService.findByEmail.mockResolvedValue(user);

    const result = await service.validateUser(user.email, 'incorrect-password');

    expect(result).toBe(null);
  });

  test('Should return user', async () => {
    const passwordHash = await bcrypt.hash('123456', 10);
    const user = makeMockUser({ passwordHash });
    usersService.findByEmail.mockResolvedValue(user);

    const result = await service.validateUser(user.email, '123456');

    expect(result).not.toBe(null);
  });

  test('Should return tokens', () => {
    jwtService.sign.mockReturnValue('fake-token');
    configService.getOrThrow.mockReturnValue('any');

    const user = makeMockUser();

    const result = service.login(user.id, user.email);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});
