import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import {
  ClassFieldOptional,
  DateField,
  EnumField,
  NumberField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '../../../decorators/field.decorators.ts';
import type { ChatMessageEntity } from '../chat-message.entity.ts';
import { ChatMessageStatus } from '../constants/chat-message-status.ts';
import { ChatMessageType } from '../constants/chat-message-type.ts';
import { ChatMessageAttachmentDto } from './chat-message-attachment.dto.ts';

export class ChatMessageDto extends AbstractDto {
  @UUIDField()
  chatId!: Uuid;

  @UUIDField()
  senderId!: Uuid;

  @StringFieldOptional({ nullable: true })
  content?: string | null;

  @EnumField(() => ChatMessageType)
  messageType!: ChatMessageType;

  @EnumField(() => ChatMessageStatus)
  status!: ChatMessageStatus;

  @NumberField({ int: true })
  sequence!: number;

  @UUIDFieldOptional({ nullable: true })
  clientMessageId?: Uuid | null;

  @DateField()
  sentAt!: Date;

  @ClassFieldOptional(() => ChatMessageAttachmentDto)
  attachment?: ChatMessageAttachmentDto;

  constructor(entity: ChatMessageEntity) {
    super(entity);
    this.chatId = entity.chatId;
    this.senderId = entity.senderId;
    this.content = entity.content;
    this.messageType = entity.messageType;
    this.status = entity.status;
    this.sequence = Number(entity.sequence);
    this.clientMessageId = entity.clientMessageId as Uuid | null;
    this.sentAt = entity.sentAt;

    if (entity.attachments?.[0]) {
      this.attachment = entity.attachments[0].toDto();
    }
  }
}
