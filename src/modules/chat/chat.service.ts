import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { v4 as uuidV4 } from 'uuid';

import { PageDto } from '../../common/dto/page.dto.ts';
import type { IFile } from '../../interfaces/IFile.ts';
import { AwsS3Service } from '../../shared/services/aws-s3.service.ts';
import { RabbitMqService } from '../../shared/services/rabbitmq.service.ts';
import { RedisService } from '../../shared/services/redis.service.ts';
import type { Reference } from '../../types.ts';
import { UserService } from '../user/user.service.ts';
import { ChatEntity } from './chat.entity.ts';
import { ChatMessageEntity } from './chat-message.entity.ts';
import { ChatParticipantEntity } from './chat-participant.entity.ts';
import { ChatMessageAttachmentType } from './constants/chat-message-attachment-type.ts';
import { ChatMessageStatus } from './constants/chat-message-status.ts';
import { ChatMessageType } from './constants/chat-message-type.ts';
import { ChatDto } from './dtos/chat.dto.ts';
import { ChatMessageDto } from './dtos/chat-message.dto.ts';
import type { ChatMessagesPageOptionsDto } from './dtos/chat-messages-page-options.dto.ts';
import type { ChatsPageOptionsDto } from './dtos/chats-page-options.dto.ts';
import type { CreateChatDto } from './dtos/create-chat.dto.ts';
import type { SendChatMessageDto } from './dtos/send-chat-message.dto.ts';
import { SendChatMessageAcceptedDto } from './dtos/send-chat-message-accepted.dto.ts';
import { ChatForbiddenException } from './exceptions/chat-forbidden.exception.ts';
import { ChatNotFoundException } from './exceptions/chat-not-found.exception.ts';
import type {
  IChatMessagePayload,
  IQueuedChatAttachment,
} from './types/chat-message-payload.ts';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(ChatParticipantEntity)
    private chatParticipantRepository: Repository<ChatParticipantEntity>,
    @InjectRepository(ChatMessageEntity)
    private chatMessageRepository: Repository<ChatMessageEntity>,
    private awsS3Service: AwsS3Service,
    private rabbitMqService: RabbitMqService,
    private redisService: RedisService,
    private userService: UserService,
  ) {}

  async createChat(
    creatorUserId: Uuid,
    createChatDto: CreateChatDto,
  ): Promise<ChatDto> {
    const isGroup = createChatDto.isGroup ?? false;
    const participantUserIds = [
      ...new Set([creatorUserId, ...createChatDto.participantUserIds]),
    ];

    if (!isGroup && participantUserIds.length === 0) {
      throw new ChatForbiddenException('error.chatDirectParticipantsInvalid');
    }

    if (isGroup && participantUserIds.length < 2) {
      throw new ChatForbiddenException('error.chatParticipantsInvalid');
    }

    if (!isGroup) {
      const existingChat =
        await this.findExistingDirectChat(participantUserIds);

      if (existingChat) {
        await this.userService.touchUserActivity(creatorUserId);

        return existingChat.toDto();
      }
    }

    const chatEntity = this.chatRepository.create({
      name: createChatDto.name ?? null,
      isGroup,
    });

    await this.chatRepository.save(chatEntity);
    await this.chatParticipantRepository.insert(
      participantUserIds.map((userId) => ({
        chatId: chatEntity.id,
        userId,
      })),
    );

    await this.userService.touchUserActivity(creatorUserId);

    return chatEntity.toDto();
  }

  async assertUserInChat(chatId: Uuid, userId: Uuid): Promise<void> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });

    if (!chat) {
      throw new ChatNotFoundException();
    }

    const participant = await this.chatParticipantRepository.findOne({
      where: { chatId, userId },
    });

    if (!participant) {
      throw new ChatForbiddenException();
    }
  }

  async getChats(
    userId: Uuid,
    pageOptionsDto: ChatsPageOptionsDto,
  ): Promise<PageDto<ChatDto>> {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'participantFilter')
      .leftJoinAndSelect('chat.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'participantUser')
      .where('participantFilter.user_id = :userId', { userId })
      .distinct(true)
      .orderBy('chat.updatedAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);
    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    const chatIds = items.map((chatEntity) => chatEntity.id);

    if (chatIds.length > 0) {
      const latestMessages = await this.chatMessageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .leftJoinAndSelect('message.attachments', 'attachment')
        .where('message.chat_id IN (:...chatIds)', { chatIds })
        .andWhere('message.status = :messageStatus', {
          messageStatus: ChatMessageStatus.SENT,
        })
        .distinctOn(['message.chatId'])
        .orderBy('message.chatId', 'ASC')
        .addOrderBy('message.sentAt', 'DESC')
        .addOrderBy('message.sequence', 'DESC')
        .getMany();
      const latestMessagesByChatId = new Map(
        latestMessages.map((message) => [message.chatId, message]),
      );

      for (const chatEntity of items) {
        chatEntity.lastMessage = latestMessagesByChatId.get(chatEntity.id);
      }
    }

    return new PageDto(items.toDtos(), pageMetaDto);
  }

  async getChatMessages(
    chatId: Uuid,
    userId: Uuid,
    pageOptionsDto: ChatMessagesPageOptionsDto,
  ): Promise<PageDto<ChatMessageDto>> {
    await this.assertUserInChat(chatId, userId);

    const search = pageOptionsDto.search?.trim();

    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.attachments', 'attachment')
      .where('message.chat_id = :chatId', { chatId })
      .orderBy('message.sequence', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (search) {
      queryBuilder.andWhere('message.content ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    return new PageDto(items.toDtos(), pageMetaDto);
  }

  async queueMessage(
    chatId: Uuid,
    senderId: Uuid,
    sendChatMessageDto: SendChatMessageDto,
    file?: Reference<IFile>,
  ): Promise<SendChatMessageAcceptedDto> {
    await this.assertUserInChat(chatId, senderId);

    const content = sendChatMessageDto.content ?? null;
    const attachment = await this.buildAttachment(file);

    if (!content && !attachment) {
      throw new ChatForbiddenException('error.chatMessageEmpty');
    }

    const brokerMessageId = uuidV4() as Uuid;
    const clientMessageId =
      sendChatMessageDto.clientMessageId ?? (uuidV4() as Uuid);
    const dedupKey = `chat:dedup:${clientMessageId}`;
    const existingBrokerMessageId = await this.redisService.getValue(dedupKey);

    if (existingBrokerMessageId) {
      return new SendChatMessageAcceptedDto({
        brokerMessageId: existingBrokerMessageId as Uuid,
        clientMessageId,
      });
    }

    const isFirstPublish = await this.redisService.setIfNotExists(
      dedupKey,
      brokerMessageId,
      60,
    );

    if (!isFirstPublish) {
      return new SendChatMessageAcceptedDto({
        brokerMessageId,
        clientMessageId,
      });
    }

    const messageType = this.resolveMessageType(content, attachment);
    const partition = this.rabbitMqService.getPartitionForChat(chatId);
    const payload: IChatMessagePayload = {
      brokerMessageId,
      clientMessageId,
      chatId,
      senderId,
      content,
      messageType,
      sentAt: new Date().toISOString(),
      partition,
      retryCount: 0,
      attachment,
    };

    await this.rabbitMqService.publishToChatPartition(
      partition,
      payload as unknown as Record<string, unknown>,
    );

    await this.userService.touchUserActivity(senderId);

    return new SendChatMessageAcceptedDto({
      brokerMessageId,
      clientMessageId,
    });
  }

  async getParticipantUserIds(chatId: Uuid): Promise<Uuid[]> {
    const participants = await this.chatParticipantRepository.find({
      where: { chatId },
      select: {
        userId: true,
      },
    });

    return participants.map((participant) => participant.userId);
  }

  async getJoinedRoomIds(userId: Uuid): Promise<Uuid[]> {
    const participants = await this.chatParticipantRepository.find({
      where: { userId },
      select: {
        chatId: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return participants.map((participant) => participant.chatId);
  }

  async touchRoomActivity(chatId: Uuid): Promise<void> {
    await this.chatRepository.update(chatId, {
      updatedAt: new Date(),
    });
  }

  private async findExistingDirectChat(
    participantUserIds: Uuid[],
  ): Promise<ChatEntity | null> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'participant')
      .where('chat.is_group = :isGroup', { isGroup: false })
      .groupBy('chat.id')
      .having('COUNT(participant.user_id) = :participantCount', {
        participantCount: participantUserIds.length,
      })
      .andHaving(
        `SUM(CASE WHEN participant.user_id IN (:...participantUserIds) THEN 1 ELSE 0 END) = :participantCount`,
        {
          participantUserIds,
          participantCount: participantUserIds.length,
        },
      )
      .getOne();
  }

  private async buildAttachment(
    file?: Reference<IFile>,
  ): Promise<IQueuedChatAttachment | null> {
    if (!file) {
      return null;
    }

    const attachmentType = this.resolveAttachmentType(file.mimetype);
    const folder = attachmentType.toLowerCase();
    const fileKey = await this.awsS3Service.uploadFile(file, folder);

    return {
      attachmentType,
      fileKey,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private resolveAttachmentType(mimeType: string): ChatMessageAttachmentType {
    if (mimeType.startsWith('image/')) {
      return ChatMessageAttachmentType.IMAGE;
    }

    if (mimeType.startsWith('video/')) {
      return ChatMessageAttachmentType.VIDEO;
    }

    return ChatMessageAttachmentType.FILE;
  }

  private resolveMessageType(
    content: string | null,
    attachment: IQueuedChatAttachment | null,
  ): ChatMessageType {
    if (content && attachment) {
      return ChatMessageType.MIXED;
    }

    if (attachment) {
      return ChatMessageType.ATTACHMENT;
    }

    return ChatMessageType.TEXT;
  }
}
