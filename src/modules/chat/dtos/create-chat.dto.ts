import {
  BooleanFieldOptional,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators.ts';

export class CreateChatDto {
  @UUIDField({ each: true })
  participantUserIds!: Uuid[];

  @StringFieldOptional({ nullable: true })
  name?: string | null;

  @BooleanFieldOptional()
  isGroup?: boolean;
}
