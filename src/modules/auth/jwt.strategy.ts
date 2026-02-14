import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { RoleType } from '../../constants/role-type.ts';
import { TokenType } from '../../constants/token-type.ts';
import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { AuthService } from './auth.service.ts';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ApiConfigService,
    private authService: AuthService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.authConfig.publicKey,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    args: {
      userId: Uuid;
      role: RoleType;
      type: TokenType;
    },
  ): Promise<UserEntity> {
    const token = this.authService.extractAccessTokenFromAuthorizationHeader(
      request.headers.authorization,
    );
    const isTokenRevoked = await this.authService.isAccessTokenRevoked(token);

    if (isTokenRevoked) {
      throw new UnauthorizedException();
    }

    if (args.type !== TokenType.ACCESS_TOKEN) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOne({
      id: args.userId as never,
      role: args.role,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
