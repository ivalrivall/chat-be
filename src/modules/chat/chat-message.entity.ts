import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity.ts';
import { UseDto } from '../../decorators/use-dto.decorator.ts';
import { UserEntity } from '../user/user.entity.ts';
import { ChatEntity } from './chat.entity.ts';
import { ChatMessageAttachmentEntity } from './chat-message-attachment.entity.ts';
import { ChatMessageStatus } from './constants/chat-message-status.ts';
import { ChatMessageType } from './constants/chat-message-type.ts';
import { ChatMessageDto } from './dtos/chat-message.dto.ts';

@Entity({ name: 'chat_messages' })
@Index('UQ_CHAT_MESSAGE_CHAT_SEQUENCE', ['chatId', 'sequence'], {
  unique: true,
})
@Index('UQ_CHAT_MESSAGE_BROKER_ID', ['brokerMessageId'], { unique: true })
@UseDto(ChatMessageDto)
export class ChatMessageEntity extends AbstractEntity<ChatMessageDto> {
  @Column({ type: 'uuid' })
  chatId!: Uuid;

  @Column({ type: 'uuid' })
  senderId!: Uuid;

  @Column({ type: 'varchar', nullable: true })
  content!: string | null;

  @Column({ type: 'enum', enum: ChatMessageType })
  messageType!: ChatMessageType;

  @Column({ type: 'enum', enum: ChatMessageStatus })
  status!: ChatMessageStatus;

  @Column({ type: 'bigint' })
  sequence!: number;

  @Column({ type: 'varchar', unique: true })
  brokerMessageId!: string;

  @Column({ type: 'varchar', nullable: true })
  clientMessageId!: string | null;

  @Column({ type: 'timestamp' })
  sentAt!: Date;

  @ManyToOne(() => ChatEntity, (chatEntity) => chatEntity.messages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'chat_id' })
  chat!: Relation<ChatEntity>;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'sender_id' })
  sender!: Relation<UserEntity>;

  @OneToMany(
    () => ChatMessageAttachmentEntity,
    (attachmentEntity) => attachmentEntity.message,
  )
  attachments?: ChatMessageAttachmentEntity[];
}
