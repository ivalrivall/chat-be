import { Column, Entity, OneToMany } from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity.ts';
import { UseDto } from '../../decorators/use-dto.decorator.ts';
import { ChatMessageEntity } from './chat-message.entity.ts';
import { ChatParticipantEntity } from './chat-participant.entity.ts';
import { ChatDto } from './dtos/chat.dto.ts';

@Entity({ name: 'chats' })
@UseDto(ChatDto)
export class ChatEntity extends AbstractEntity<ChatDto> {
  @Column({ nullable: true, type: 'varchar' })
  name!: string | null;

  @Column({ type: 'boolean', default: false })
  isGroup!: boolean;

  @OneToMany(() => ChatParticipantEntity, (participant) => participant.chat)
  participants?: ChatParticipantEntity[];

  @OneToMany(() => ChatMessageEntity, (message) => message.chat)
  messages?: ChatMessageEntity[];

  lastMessage?: ChatMessageEntity;
}
