import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { ApiConfigService } from './api-config.service.ts';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private apiConfigService: ApiConfigService) {
    const redisConfig = this.apiConfigService.redisConfig;

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: null,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }

  async getValue(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async addToSet(key: string, value: string): Promise<void> {
    await this.client.sadd(key, value);
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    await this.client.srem(key, value);
  }

  async getSetMembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async publish(channel: string, payload: string): Promise<void> {
    await this.client.publish(channel, payload);
  }

  createSubscriber(): Redis {
    const redisConfig = this.apiConfigService.redisConfig;

    return new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
