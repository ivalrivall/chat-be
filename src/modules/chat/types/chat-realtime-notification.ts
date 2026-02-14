import type { ChatMessageDto } from '../dtos/chat-message.dto.ts';

export interface IChatRealtimeNotification {
  event: 'chat.message.new' | 'chat.message.saved';
  recipientUserIds: Uuid[];
  chatId: Uuid;
  message: ChatMessageDto;
}
