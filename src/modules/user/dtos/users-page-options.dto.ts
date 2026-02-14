import { PageOptionsDto } from '../../../common/dto/page-options.dto.ts';
import { StringFieldOptional } from '../../../decorators/field.decorators.ts';

export class UsersPageOptionsDto extends PageOptionsDto {
  @StringFieldOptional({
    description:
      'Search users by first name, last name, email, phone, or fallback to q',
  })
  search?: string;
}
