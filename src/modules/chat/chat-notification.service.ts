import { Injectable } from '@nestjs/common';

import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import { RedisService } from '../../shared/services/redis.service.ts';
import type { IChatRealtimeNotification } from './types/chat-realtime-notification.ts';

@Injectable()
export class ChatNotificationService {
  constructor(
    private redisService: RedisService,
    private apiConfigService: ApiConfigService,
  ) {}

  async publishNotification(payload: IChatRealtimeNotification): Promise<void> {
    await this.redisService.publish(
      this.apiConfigService.chatConfig.notificationChannel,
      JSON.stringify(payload),
    );
  }
}
