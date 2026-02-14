import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConsumeMessage } from 'amqplib';
import type { Repository } from 'typeorm';

import { ApiConfigService } from '../../shared/services/api-config.service.ts';
import { RabbitMqService } from '../../shared/services/rabbitmq.service.ts';
import { RedisService } from '../../shared/services/redis.service.ts';
import { ChatEntity } from './chat.entity.ts';
import { ChatService } from './chat.service.ts';
import { ChatMessageEntity } from './chat-message.entity.ts';
import { ChatMessageAttachmentEntity } from './chat-message-attachment.entity.ts';
import { ChatNotificationService } from './chat-notification.service.ts';
import { ChatMessageStatus } from './constants/chat-message-status.ts';
import type { IChatMessagePayload } from './types/chat-message-payload.ts';

@Injectable()
export class ChatWorkerService implements OnModuleInit {
  constructor(
    private rabbitMqService: RabbitMqService,
    private redisService: RedisService,
    private apiConfigService: ApiConfigService,
    private chatService: ChatService,
    private chatNotificationService: ChatNotificationService,
    @InjectRepository(ChatMessageEntity)
    private chatMessageRepository: Repository<ChatMessageEntity>,
    @InjectRepository(ChatMessageAttachmentEntity)
    private attachmentRepository: Repository<ChatMessageAttachmentEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.apiConfigService.chatConfig.workerEnabled) {
      return;
    }

    await this.rabbitMqService.assertChatTopology();

    const partitionCount = this.apiConfigService.rabbitMqConfig.partitionCount;

    await Promise.all(
      Array.from({ length: partitionCount }, (_, partition) =>
        this.rabbitMqService.consumePartition(partition, (message) =>
          this.handleMessage(message),
        ),
      ),
    );
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const payload = JSON.parse(
      message.content.toString(),
    ) as IChatMessagePayload;

    try {
      await this.persistMessage(payload);
      this.rabbitMqService.ack(message);
    } catch {
      await this.handleFailure(payload);
      this.rabbitMqService.ack(message);
    }
  }

  private async persistMessage(payload: IChatMessagePayload): Promise<void> {
    const existing = await this.chatMessageRepository.findOne({
      where: {
        brokerMessageId: payload.brokerMessageId,
      },
    });

    if (existing) {
      return;
    }

    const sequence = await this.redisService.increment(
      `chat:${payload.chatId}:seq`,
    );
    const messageEntity = this.chatMessageRepository.create({
      chatId: payload.chatId,
      senderId: payload.senderId,
      content: payload.content,
      messageType: payload.messageType,
      status: ChatMessageStatus.SENT,
      sequence,
      brokerMessageId: payload.brokerMessageId,
      clientMessageId: payload.clientMessageId,
      sentAt: new Date(payload.sentAt),
    });

    await this.chatMessageRepository.save(messageEntity);

    if (payload.attachment) {
      const attachmentEntity = this.attachmentRepository.create({
        messageId: messageEntity.id,
        fileKey: payload.attachment.fileKey,
        mimeType: payload.attachment.mimeType,
        size: payload.attachment.size,
        attachmentType: payload.attachment.attachmentType,
      });

      await this.attachmentRepository.save(attachmentEntity);
      messageEntity.attachments = [attachmentEntity];
    }

    await this.chatMessageRepository.manager.update(
      ChatEntity,
      payload.chatId,
      {
        updatedAt: new Date(),
      },
    );

    const participantUserIds = await this.chatService.getParticipantUserIds(
      payload.chatId,
    );
    const recipientUserIds = participantUserIds.filter(
      (userId) => userId !== payload.senderId,
    );

    await this.chatNotificationService.publishNotification({
      event: 'chat.message.new',
      recipientUserIds,
      chatId: payload.chatId,
      message: messageEntity.toDto(),
    });

    await this.chatNotificationService.publishNotification({
      event: 'chat.message.saved',
      recipientUserIds: [payload.senderId],
      chatId: payload.chatId,
      message: messageEntity.toDto(),
    });
  }

  private async handleFailure(payload: IChatMessagePayload): Promise<void> {
    const retryCount = payload.retryCount + 1;
    const maxRetries = this.apiConfigService.rabbitMqConfig.maxRetries;

    if (retryCount > maxRetries) {
      await this.rabbitMqService.publishToDlq({
        ...payload,
        retryCount,
        failedAt: new Date().toISOString(),
      });

      return;
    }

    await this.rabbitMqService.publishToRetry(payload.partition, {
      ...payload,
      retryCount,
    });
  }
}
