import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { validateHash } from '../../common/utils.ts';
import type { RoleType } from '../../constants/role-type.ts';
import { TokenType } from '../../constants/token-type.ts';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.ts';
import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import { RedisService } from '../../shared/services/redis.service.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { TokenPayloadDto } from './dto/token-payload.dto.ts';
import type { UserLoginDto } from './dto/user-login.dto.ts';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private redisService: RedisService,
    private userService: UserService,
  ) {}

  async createAccessToken(data: {
    role: RoleType;
    userId: Uuid;
  }): Promise<TokenPayloadDto> {
    return new TokenPayloadDto({
      expiresIn: this.configService.authConfig.jwtExpirationTime,
      token: await this.jwtService.signAsync(
        {
          userId: data.userId,
          type: TokenType.ACCESS_TOKEN,
          role: data.role,
        },
        {
          expiresIn: this.configService.authConfig.jwtExpirationTime,
        },
      ),
    });
  }

  extractAccessTokenFromAuthorizationHeader(
    authorizationHeader?: string,
  ): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException();
    }

    const [prefix, token] = authorizationHeader.split(' ');

    if (prefix !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    return token;
  }

  async isAccessTokenRevoked(token: string): Promise<boolean> {
    const revokedToken = await this.redisService.getValue(
      this.getTokenBlacklistKey(token),
    );

    return revokedToken !== null;
  }

  async logout(authorizationHeader?: string): Promise<void> {
    const token =
      this.extractAccessTokenFromAuthorizationHeader(authorizationHeader);
    const ttlSeconds = Math.max(
      1,
      this.configService.authConfig.jwtExpirationTime,
    );

    await this.redisService
      .getClient()
      .set(this.getTokenBlacklistKey(token), '1', 'EX', ttlSeconds);
  }

  async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.userService.findOne({
      email: userLoginDto.email,
    });

    const isPasswordValid = await validateHash(
      userLoginDto.password,
      user?.password,
    );

    if (!isPasswordValid) {
      throw new UserNotFoundException();
    }

    return user!;
  }

  private getTokenBlacklistKey(token: string): string {
    return `auth:blacklist:${token}`;
  }
}
