import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type {
  Channel,
  Connection,
  ConsumeMessage,
  Message,
  Options,
  Replies,
} from 'amqplib';
import { connect } from 'amqplib';

import { ApiConfigService } from './api-config.service.ts';

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private connection?: Connection;

  private channel?: Channel;

  private topologyInitialized = false;

  constructor(private apiConfigService: ApiConfigService) {}

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await connect(this.apiConfigService.rabbitMqConfig.uri);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.channel = await this.connection.createChannel();

    return this.channel;
  }

  private getPartitionQueueNames(): string[] {
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;

    return Array.from(
      { length: rabbitMqConfig.partitionCount },
      (_, index) => `${rabbitMqConfig.messageQueuePrefix}.p${index}`,
    );
  }

  getPartitionForChat(chatId: Uuid): number {
    const partitionCount = this.apiConfigService.rabbitMqConfig.partitionCount;
    let hash = 0;

    for (const character of chatId) {
      hash = (hash + (character.codePointAt(0) ?? 0)) % partitionCount;
    }

    return hash;
  }

  async assertChatTopology(): Promise<void> {
    if (this.topologyInitialized) {
      return;
    }

    const channel = await this.getChannel();
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;
    const retryExchange = `${rabbitMqConfig.exchange}.retry`;

    await channel.assertExchange(rabbitMqConfig.exchange, 'direct', {
      durable: true,
    });
    await channel.assertExchange(rabbitMqConfig.dlxExchange, 'direct', {
      durable: true,
    });
    await channel.assertExchange(retryExchange, 'direct', {
      durable: true,
    });
    await channel.assertQueue(rabbitMqConfig.dlqName, { durable: true });
    await channel.bindQueue(
      rabbitMqConfig.dlqName,
      rabbitMqConfig.dlxExchange,
      rabbitMqConfig.dlqName,
    );

    const partitionQueueNames = this.getPartitionQueueNames();

    await Promise.all(
      partitionQueueNames.map(async (partitionQueueName) => {
        const retryQueueName = `${partitionQueueName}.retry`;

        await channel.assertQueue(partitionQueueName, {
          durable: true,
          arguments: {
            ['x-dead-letter-exchange']: rabbitMqConfig.dlxExchange,
            ['x-dead-letter-routing-key']: rabbitMqConfig.dlqName,
          },
        });
        await channel.bindQueue(
          partitionQueueName,
          rabbitMqConfig.exchange,
          partitionQueueName,
        );
        await channel.assertQueue(retryQueueName, {
          durable: true,
          arguments: {
            ['x-message-ttl']: 5000,
            ['x-dead-letter-exchange']: rabbitMqConfig.exchange,
            ['x-dead-letter-routing-key']: partitionQueueName,
          },
        });
        await channel.bindQueue(
          retryQueueName,
          retryExchange,
          partitionQueueName,
        );
      }),
    );

    this.topologyInitialized = true;
  }

  async publishToChatPartition(
    partition: number,
    payload: Record<string, unknown>,
    options?: Options.Publish,
  ): Promise<boolean> {
    await this.assertChatTopology();
    const channel = await this.getChannel();
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;
    const queueName = `${rabbitMqConfig.messageQueuePrefix}.p${partition}`;

    return channel.publish(
      rabbitMqConfig.exchange,
      queueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        timestamp: Date.now(),
        ...options,
      },
    );
  }

  async publishToRetry(
    partition: number,
    payload: Record<string, unknown>,
    options?: Options.Publish,
  ): Promise<boolean> {
    await this.assertChatTopology();
    const channel = await this.getChannel();
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;
    const retryExchange = `${rabbitMqConfig.exchange}.retry`;
    const queueName = `${rabbitMqConfig.messageQueuePrefix}.p${partition}`;

    return channel.publish(
      retryExchange,
      queueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        ...options,
      },
    );
  }

  async publishToDlq(payload: Record<string, unknown>): Promise<boolean> {
    await this.assertChatTopology();
    const channel = await this.getChannel();
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;

    return channel.publish(
      rabbitMqConfig.dlxExchange,
      rabbitMqConfig.dlqName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
      },
    );
  }

  async consumePartition(
    partition: number,
    onMessage: (message: ConsumeMessage) => Promise<void>,
  ): Promise<Replies.Consume> {
    await this.assertChatTopology();
    const channel = await this.getChannel();
    const rabbitMqConfig = this.apiConfigService.rabbitMqConfig;
    const queueName = `${rabbitMqConfig.messageQueuePrefix}.p${partition}`;

    await channel.prefetch(rabbitMqConfig.consumerPrefetch);

    return channel.consume(
      queueName,
      (message) => {
        if (!message) {
          return;
        }

        void onMessage(message);
      },
      {
        noAck: false,
      },
    );
  }

  ack(message: Message): void {
    this.channel?.ack(message);
  }

  nack(message: Message, requeue = false): void {
    this.channel?.nack(message, false, requeue);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.connection?.close();
  }
}
