import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import {
  EnumField,
  NumberField,
  StringField,
} from '../../../decorators/field.decorators.ts';
import type { ChatMessageAttachmentEntity } from '../chat-message-attachment.entity.ts';
import { ChatMessageAttachmentType } from '../constants/chat-message-attachment-type.ts';

export class ChatMessageAttachmentDto extends AbstractDto {
  @StringField()
  fileKey!: string;

  @StringField()
  mimeType!: string;

  @NumberField({ int: true })
  size!: number;

  @EnumField(() => ChatMessageAttachmentType)
  attachmentType!: ChatMessageAttachmentType;

  constructor(entity: ChatMessageAttachmentEntity) {
    super(entity);
    this.fileKey = entity.fileKey;
    this.mimeType = entity.mimeType;
    this.size = entity.size;
    this.attachmentType = entity.attachmentType;
  }
}
