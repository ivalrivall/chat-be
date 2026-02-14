import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RoleType } from '../../constants/role-type.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import { Auth } from '../../decorators/http.decorators.ts';
import { UserDto } from '../user/dtos/user.dto.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { UserService } from '../user/user.service.ts';
import { AuthService } from './auth.service.ts';
import { LoginPayloadDto } from './dto/login-payload.dto.ts';
import { LogoutPayloadDto } from './dto/logout-payload.dto.ts';
import { UserLoginDto } from './dto/user-login.dto.ts';
import { UserRegisterDto } from './dto/user-register.dto.ts';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginPayloadDto> {
    const userEntity = await this.authService.validateUser(userLoginDto);

    await this.userService.touchUserActivity(userEntity.id);

    const token = await this.authService.createAccessToken({
      userId: userEntity.id,
      role: userEntity.role,
    });

    return new LoginPayloadDto(userEntity.toDto(), token);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto, description: 'Successfully Registered' })
  async userRegister(
    @Body() userRegisterDto: UserRegisterDto,
  ): Promise<UserDto> {
    const createdUser = await this.userService.createUser(userRegisterDto);

    return createdUser.toDto();
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @ApiOkResponse({ type: UserDto, description: 'current user info' })
  getCurrentUser(@AuthUser() user: UserEntity): UserDto {
    return user.toDto();
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @ApiOkResponse({ type: LogoutPayloadDto, description: 'Successfully logout' })
  async userLogout(
    @Headers('authorization') authorizationHeader?: string,
  ): Promise<LogoutPayloadDto> {
    await this.authService.logout(authorizationHeader);

    return new LogoutPayloadDto(true);
  }
}
