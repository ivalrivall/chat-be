import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity.ts';
import { UserEntity } from '../user/user.entity.ts';
import { ChatEntity } from './chat.entity.ts';

@Entity({ name: 'chat_participants' })
@Unique('UQ_CHAT_PARTICIPANT_CHAT_USER', ['chatId', 'userId'])
export class ChatParticipantEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  chatId!: Uuid;

  @Column({ type: 'uuid' })
  userId!: Uuid;

  @ManyToOne(() => ChatEntity, (chatEntity) => chatEntity.participants, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'chat_id' })
  chat!: Relation<ChatEntity>;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserEntity>;
}
