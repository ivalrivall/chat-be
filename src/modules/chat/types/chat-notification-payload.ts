import type { ChatMessageDto } from '../dtos/chat-message.dto.ts';

export interface IChatNotificationPayload {
  chatId: Uuid;
  message: ChatMessageDto;
}
