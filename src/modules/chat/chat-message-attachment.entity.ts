import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity.ts';
import { UseDto } from '../../decorators/use-dto.decorator.ts';
import { ChatMessageEntity } from './chat-message.entity.ts';
import { ChatMessageAttachmentType } from './constants/chat-message-attachment-type.ts';
import { ChatMessageAttachmentDto } from './dtos/chat-message-attachment.dto.ts';

@Entity({ name: 'chat_message_attachments' })
@UseDto(ChatMessageAttachmentDto)
export class ChatMessageAttachmentEntity extends AbstractEntity<ChatMessageAttachmentDto> {
  @Column({ type: 'uuid' })
  messageId!: Uuid;

  @Column({ type: 'varchar' })
  fileKey!: string;

  @Column({ type: 'varchar' })
  mimeType!: string;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'enum', enum: ChatMessageAttachmentType })
  attachmentType!: ChatMessageAttachmentType;

  @ManyToOne(
    () => ChatMessageEntity,
    (messageEntity) => messageEntity.attachments,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'message_id' })
  message!: Relation<ChatMessageEntity>;
}
