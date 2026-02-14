import { PageOptionsDto } from '../../../common/dto/page-options.dto.ts';
import { StringFieldOptional } from '../../../decorators/field.decorators.ts';

export class ChatMessagesPageOptionsDto extends PageOptionsDto {
  @StringFieldOptional({
    description: 'Search chat messages by content text',
  })
  search?: string;
}
