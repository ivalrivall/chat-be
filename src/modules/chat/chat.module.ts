import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module.ts';
import { ChatController } from './chat.controller.ts';
import { ChatEntity } from './chat.entity.ts';
import { ChatGateway } from './chat.gateway.ts';
import { ChatService } from './chat.service.ts';
import { ChatMessageEntity } from './chat-message.entity.ts';
import { ChatMessageAttachmentEntity } from './chat-message-attachment.entity.ts';
import { ChatNotificationService } from './chat-notification.service.ts';
import { ChatParticipantEntity } from './chat-participant.entity.ts';
import { ChatWorkerService } from './chat-worker.service.ts';

@Module({
  imports: [
    JwtModule,
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([
      ChatEntity,
      ChatParticipantEntity,
      ChatMessageEntity,
      ChatMessageAttachmentEntity,
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    ChatNotificationService,
    ChatWorkerService,
  ],
  exports: [ChatService, ChatNotificationService],
})
export class ChatModule {}
