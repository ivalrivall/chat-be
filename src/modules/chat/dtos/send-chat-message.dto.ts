import {
  StringFieldOptional,
  UUIDFieldOptional,
} from '../../../decorators/field.decorators.ts';

export class SendChatMessageDto {
  @StringFieldOptional({ nullable: true })
  content?: string | null;

  @UUIDFieldOptional()
  clientMessageId?: Uuid;
}
