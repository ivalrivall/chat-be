import type { ChatMessageAttachmentType } from '../constants/chat-message-attachment-type.ts';
import type { ChatMessageType } from '../constants/chat-message-type.ts';

export interface IQueuedChatAttachment {
  attachmentType: ChatMessageAttachmentType;
  fileKey: string;
  mimeType: string;
  size: number;
}

export interface IChatMessagePayload {
  brokerMessageId: string;
  clientMessageId: string;
  chatId: Uuid;
  senderId: Uuid;
  content: string | null;
  messageType: ChatMessageType;
  sentAt: string;
  partition: number;
  retryCount: number;
  attachment: IQueuedChatAttachment | null;
}
