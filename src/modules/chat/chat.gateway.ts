import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

import { TokenType } from '../../constants/token-type.ts';
import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import { RedisService } from '../../shared/services/redis.service.ts';
import { UserService } from '../user/user.service.ts';
import type { IChatRealtimeNotification } from './types/chat-realtime-notification.ts';

interface ISocketContext {
  userId?: Uuid;
}

@Injectable()
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server?: Server;

  private subscriber?: Redis;

  constructor(
    private redisService: RedisService,
    private apiConfigService: ApiConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.apiConfigService.chatConfig.workerEnabled) {
      return;
    }

    this.subscriber = this.redisService.createSubscriber();
    const notificationChannel =
      this.apiConfigService.chatConfig.notificationChannel;

    await this.subscriber.subscribe(notificationChannel);
    this.subscriber.on('message', (_, payload) => {
      void this.handleNotificationPayload(payload);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const userId = await this.validateSocket(client);

    (client.data as ISocketContext).userId = userId;
    await this.redisService.addToSet(`chat:user:${userId}:sockets`, client.id);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = (client.data as ISocketContext).userId;

    if (!userId) {
      return;
    }

    await this.redisService.removeFromSet(
      `chat:user:${userId}:sockets`,
      client.id,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    await this.subscriber.unsubscribe(
      this.apiConfigService.chatConfig.notificationChannel,
    );
    await this.subscriber.quit();
  }

  private async handleNotificationPayload(payload: string): Promise<void> {
    const notification = JSON.parse(payload) as IChatRealtimeNotification;

    await Promise.all(
      notification.recipientUserIds.map(async (userId) => {
        const socketIds = await this.redisService.getSetMembers(
          `chat:user:${userId}:sockets`,
        );

        for (const socketId of socketIds) {
          this.emitToClient(socketId, notification.event, {
            chatId: notification.chatId,
            message: notification.message,
          });
        }
      }),
    );
  }

  private emitToClient(
    socketId: string,
    event: string,
    payload: unknown,
  ): void {
    const server = this.server;

    if (!server) {
      return;
    }

    server.to(socketId).emit(event, payload);
  }

  private async validateSocket(client: Socket): Promise<Uuid> {
    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException();
    }

    const jwtPayload = await this.jwtService.verifyAsync<{
      userId: Uuid;
      type: TokenType;
    }>(token, {
      publicKey: this.apiConfigService.authConfig.publicKey,
      algorithms: ['RS256'],
    });

    if (jwtPayload.type !== TokenType.ACCESS_TOKEN) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOne({
      id: jwtPayload.userId as never,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user.id;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth.token as string | undefined;

    if (authToken) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;

    if (!authorizationHeader) {
      return null;
    }

    const [prefix, token] = authorizationHeader.split(' ');

    if (prefix !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
