import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import {
  BooleanField,
  ClassFieldOptional,
  DateField,
  EnumField,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators.ts';
import type { ChatEntity } from '../chat.entity.ts';
import type { ChatMessageEntity } from '../chat-message.entity.ts';
import { ChatMessageType } from '../constants/chat-message-type.ts';
import { ChatMessageAttachmentDto } from './chat-message-attachment.dto.ts';

export class ChatParticipantDto {
  @UUIDField()
  id!: Uuid;

  @StringField()
  name!: string;

  @DateField()
  updatedAt!: Date;

  constructor(id: Uuid, name: string, updatedAt: Date) {
    this.id = id;
    this.name = name;
    this.updatedAt = updatedAt;
  }
}

class ChatLastMessagePreviewDto {
  @EnumField(() => ChatMessageType)
  messageType!: ChatMessageType;

  @StringFieldOptional({ nullable: true })
  content?: string | null;

  @DateField()
  sentAt!: Date;

  @StringFieldOptional({ nullable: true })
  senderEmail?: string | null;

  @ClassFieldOptional(() => ChatMessageAttachmentDto)
  attachment?: ChatMessageAttachmentDto;

  constructor(message: ChatMessageEntity) {
    this.messageType = message.messageType;
    this.content = message.content;
    this.sentAt = message.sentAt;
    this.senderEmail = message.sender.email;

    if (
      [ChatMessageType.ATTACHMENT, ChatMessageType.MIXED].includes(
        message.messageType,
      ) &&
      message.attachments?.[0]
    ) {
      this.attachment = message.attachments[0].toDto();
    }
  }
}

export class ChatDto extends AbstractDto {
  @StringFieldOptional({ nullable: true })
  name?: string | null;

  @BooleanField()
  isGroup!: boolean;

  @ClassFieldOptional(() => ChatParticipantDto, { each: true })
  participants?: ChatParticipantDto[];

  @ClassFieldOptional(() => ChatLastMessagePreviewDto)
  lastMessage?: ChatLastMessagePreviewDto;

  constructor(chatEntity: ChatEntity) {
    super(chatEntity);
    this.name = chatEntity.name;
    this.isGroup = chatEntity.isGroup;
    this.participants = chatEntity.participants?.map(
      (participant) =>
        new ChatParticipantDto(
          participant.userId,
          participant.user.email,
          participant.updatedAt,
        ),
    );

    if (chatEntity.lastMessage) {
      this.lastMessage = new ChatLastMessagePreviewDto(chatEntity.lastMessage);
    }
  }
}
